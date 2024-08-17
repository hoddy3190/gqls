import { assert } from "node:console";

export const JSON = "application/json";
export const URL_ENCODED = "application/x-www-form-urlencoded";
export const GRAPHQL_RES = "application/graphql-response+json";

export type Typ = typeof JSON | typeof URL_ENCODED | typeof GRAPHQL_RES;

// https://datatracker.ietf.org/doc/html/rfc9110
// https://httpwg.org/specs/rfc9110.html#rule.parameter

/**
 *    ABNF of Content-Type header
 *  -----------------------------------------------------------------------
 *    Content-Type = media-type
 *
 *    media-type = type "/" subtype parameters
 *    type       = token
 *    subtype    = token
 *  -----------------------------------------------------------------------
 *    The type and subtype tokens are case-insensitive.
 *    token = https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.2
 */

/**
 *    ABNF of parameters
 *  -----------------------------------------------------------------------
 *    parameters      = *( OWS ";" OWS [ parameter ] )
 *    parameter       = parameter-name "=" parameter-value
 *    parameter-name  = token
 *    parameter-value = ( token / quoted-string )
 *    OWS             = *( SP / HTAB )
 *  -----------------------------------------------------------------------
 *    SP = space, HTAB = horizontal tab
 */

//    ABNF of Accept header
//  -----------------------------------------------------------------------
//    Accept      = #( media-range [ weight ] )
//
//    media-range = ( "*/*"
//                    / ( type "/" "*" )
//                    / ( type "/" subtype )
//                  ) parameters
//  -----------------------------------------------------------------------

const removeLeadingWhitespace = (str: string): string => {
  return str.replace(/^[ \t\n\r]+/u, "");
};

const removeTrailingWhitespace = (str: string): string => {
  return str.replace(/[ \t\n\r]+$/u, "");
};

const removeSurroundingWhitespace = (str: string): string => {
  return removeLeadingWhitespace(removeTrailingWhitespace(str));
};

// OWS = *( SP / HTAB ) ref: https://datatracker.ietf.org/doc/html/rfc9110#whitespace
const isOWS = (char: string): boolean => {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
};

const isToken = (str: string): boolean => {
  // ABNF of token: https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.2
  return /^[-!#$%&'*+.^_`|~A-Za-z0-9]+$/u.test(str);
};

// const isQdText = (str: string): boolean => {
//   // \u0022 = ", \u005C = \
//   return /^[\t\s\u0021\u0023-\u005B\u005D-\u007E\u0080-\u00FF]+$/u.test(str);
// };

/**
 * Check if the character can follow backslash.
 *
 * [ABNF]
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * VCHAR       = %x21-7E
 * obs-text    = %x80-FF
 *
 * VCHAR is defined in https://datatracker.ietf.org/doc/html/rfc5234#appendix-B.1
 *
 * @param char
 * @returns boolean
 */
// const canFollowBackslash = (char: string): boolean => {
//   assert(char.length === 1);
//   return /^[\t\s\u0021-\u007E\u0080-\u00FF]$/u.test(char);
// };

/**
 * Check if the string can be *( qdtext / quoted-pair ) .
 * It handles a quoted-pair as if it were replaced by the octet following the backslash.
 *
 * [ABNF]
 * quoted-string  = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 *
 * @param str
 * @returns
 */
const canBeStringInnerQuotations = (str: string): boolean => {
  // union of qdtext and quoted-pair
  return /^[\t\s\u0021-\u007E\u0080-\u00FF]*$/u.test(str);
};

const getStringInnerQuotations = (
  input: string,
  position: number
): [string, number] => {
  // [whatwg]: 1. Let positionStart be position.
  // => positionStart is unnecessary in this implementation.

  // [whatwg]: 2. Let value be the empty string.
  let value = "";

  // [whatwg]: 3. Assert: input[position] is U+0022 (").
  assert(input[position] === '"');

  // [whatwg]: 4. Advance position by 1.
  position++;

  const len = input.length;

  // [whatwg]: 5. While true:
  while (true) {
    // [whatwg]: 5-1. Append the result of collecting a sequence of code points that are not U+0022 (") or U+005C (\) from input, given position, to value.
    while (position < len && input[position] !== '"' && input[position] !== "\\") {
      value += input[position];
      position++;
    }

    // [whatwg]: 5-2. If position is past the end of input, then break.
    if (position >= len) break;

    // [whatwg]: 5-3. Let quoteOrBackslash be the code point at position within input.
    const quoteOrBackslash = input[position];

    // [whatwg]: 5-4. Advance position by 1.
    position++;

    // [whatwg]: 5-5. If quoteOrBackslash is U+005C (\), then:
    if (quoteOrBackslash === "\\") {
      // [whatwg]: 5-5-1. If position is past the end of input, then append U+005C (\) to value and break.
      if (position >= len) {
        value += quoteOrBackslash;
        break;
      }

      // [whatwg]: 5-5-2. Append the code point at position within input to value.
      value += input[position];

      // [whatwg]: 5-5-3. Advance position by 1.
      position++;
    } else {
      // [whatwg]: 5-6. Otherwise:

      // [whatwg]: 5-6-1. quoteOrBackslash is U+0022 (").
      assert(quoteOrBackslash === '"');

      // [whatwg]: 5-6-2. Break.
      break;
    }
  }

  // [whatwg]: 6. If extract-value is true, then return value.
  // [whatwg]: 7. Return the code points from positionStart to position, inclusive, within input.
  return [value, position];
};

export interface MediaType {
  type: string;
  subtype: string;
  mediaType: string;
  parameters: Map<string, string>;
}

// https://mimesniff.spec.whatwg.org/#parsing-a-mime-type
export const parseMediaType = (str: string): MediaType | null => {
  // [rfc9110]: A field value does not include leading or trailing whitespace.
  //            When a specific version of HTTP allows such whitespace to appear in a message,
  //            a field parsing implementation MUST exclude such whitespace prior to evaluating the field value.
  // [whatwg] : 1. Remove any leading and trailing HTTP whitespace from input.
  str = removeSurroundingWhitespace(str);

  const len = str.length;

  // [whatwg]: 2. Let position be a position variable for input, initially pointing at the start of input.
  let position = 0;

  // [whatwg]: 3. Let type be the result of collecting a sequence of code points that are not U+002F (/) from input, given position.
  let type = "";
  while (position < len && str[position] !== "/") {
    type += str[position];
    position++;
  }

  // [whatwg]: 4. If type is the empty string or does not solely contain HTTP token code points, then return failure.
  // [whatwg]: 5. If position is past the end of input, then return failure.
  if (type === "" || position >= len || !isToken(type)) {
    return null;
  }

  // [whatwg]: 6. Advance position by 1. (This skips past U+002F (/).)
  position++;

  // [whatwg]: 7. Let subtype be the result of collecting a sequence of code points that are not U+003B (;) from input, given position.
  let subtype = "";
  while (position < len && str[position] !== ";") {
    subtype += str[position];
    position++;
  }

  // [whatwg]: 8. Remove any trailing HTTP whitespace from subtype.
  subtype = removeTrailingWhitespace(subtype);

  // [whatwg]: 9. If subtype is the empty string or does not solely contain HTTP token code points, then return failure.
  if (subtype === "" || !isToken(subtype)) {
    return null;
  }

  // [whatwg]: 10. Let mimeType be a new MIME type record whose type is type, in ASCII lowercase, and subtype is subtype, in ASCII lowercase.
  type = type.toLocaleLowerCase();
  subtype = subtype.toLocaleLowerCase();
  const mediaType = type + "/" + subtype;

  const result: MediaType = {
    type,
    subtype,
    mediaType,
    parameters: new Map<string, string>(),
  };

  // [whatwg]: 11. While position is not past the end of input:
  while (position < len) {
    // [whatwg]: 11-1. Advance position by 1. (This skips past U+003B (;).)
    position++;

    // [whatwg]: 11-2. Collect a sequence of code points that are HTTP whitespace from input given position.
    // if position < len, then str[position] is not undefined.
    while (position < len && isOWS(str[position]!)) {
      position++;
    }

    // [whatwg]: 11-3. Let parameterName be the result of collecting a sequence of code points that are not U+003B (;) or U+003D (=) from input, given position.
    let parameterName = "";
    while (position < len && str[position] !== ";" && str[position] !== "=") {
      parameterName += str[position];
      position++;
    }

    // [whatwg]: 11-4. Set parameterName to parameterName, in ASCII lowercase.
    parameterName = parameterName.toLocaleLowerCase();

    // [whatwg]: 11-5. If position is not past the end of input, then:
    if (position < len) {
      if (str[position] === ";") {
        continue;
      } else if (str[position] === "=") {
        position++;
      }
    } else {
      // [whatwg]: 11-6. If position is past the end of input, then break.
      break;
    }

    // [whatwg]: 11-7. Let parameterValue be null.
    // REVIEW: I don't understand not empty string but null. null is inconvenient to use because of null check.
    let parameterValue = "";

    // [whatwg]: 11-8. If the code point at position within input is U+0022 ("), then:
    if (str[position] === '"') {
      [parameterValue, position] = getStringInnerQuotations(str, position);
      while (position < len && str[position] !== ";") {
        position++;
      }
    } else {
      // [whatwg]: 11-9. Otherwise:

      // [whatwg]: 11-9-1. Set parameterValue to the result of collecting a sequence of code points that are not U+003B (;) from input, given position.
      while (position < len && str[position] !== ";") {
        parameterValue += str[position];
        position++;
      }

      // [whatwg]: 11-9-2. Remove any trailing HTTP whitespace from parameterValue.
      parameterValue = removeTrailingWhitespace(parameterValue);

      // [whatwg]: 11-9-3. If parameterValue is the empty string, then continue.
      if (parameterValue === "") continue;
    }

    // [whatwg]: 11-10. If all of the following are true
    {
      // [whatwg]: 11-10. parameterName is not the empty string
      if (parameterName === "") continue;
      // [whatwg]: 11-10. mimeType’s parameters[parameterName] does not exist
      if (result.parameters.has(parameterName)) continue;
      // [whatwg]: 11-10. parameterName solely contains HTTP token code points
      if (!isToken(parameterName)) continue;
      // [whatwg]: 11-10. parameterValue solely contains HTTP quoted-string token code points
      if (!canBeStringInnerQuotations(parameterValue)) continue;
    }
    // [whatwg]: 11-10. then set mimeType’s parameters[parameterName] to parameterValue.
    result.parameters.set(parameterName, parameterValue);
  }

  // [whatwg]: 12. Return mimeType.
  return result;
};
