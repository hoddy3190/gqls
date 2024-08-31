import { assert } from "node:console";

const HTAB = String.fromCharCode(0x09);
const SP = String.fromCharCode(0x20);
const DQUOTE = String.fromCharCode(0x22);
const REVERSE_SOLIDUS = String.fromCharCode(0x5c);

const charSet = (fromCode: number, toCode: number): Set<string> => {
  return Array.from({ length: toCode - fromCode + 1 }, (_, i) =>
    String.fromCharCode(i + fromCode)
  ).reduce((acc, char) => {
    acc.add(char);
    return acc;
  }, new Set<string>());
};

/**
 * token = 1*tchar
 * tchar = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *       / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *       / DIGIT / ALPHA
 * DIGIT = %x30-39             ; 0-9
 * ALPHA = %x41-5A / %x61-7A   ; A-Z / a-z
 *
 * @see: https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.2
 * @see: https://datatracker.ietf.org/doc/html/rfc5234#appendix-B.1
 */
// prettier-ignore
const tcharSet = new Set([
  "!", "#", "$", "%", "&", "'", "*",
  "+", "-", ".", "^", "_", "`", "|", "~",
  ...charSet(0x30, 0x39), // 0-9
  ...charSet(0x41, 0x5a), // A-Z
  ...charSet(0x61, 0x7a), // a-z
]);
const isTchar = (char: string): boolean => tcharSet.has(char);

/**
 * parameter-value = ( token / quoted-string )
 *
 * quoted-string   = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext          = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * quoted-pair     = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text        = %x80-FF
 *
 * VCHAR = %x21-7E
 *
 * So, character set used in qdtext is:
 *
 * qdTextCharSet = ( HTAB / SP / VCHAR / obs-text ) of quoted-pair - DQUOTE - REVERSE_SOLIDUS
 *
 * And diffSet is used for optimizing memory usage.
 *
 * diffSet = ( HTAB / SP / VCHAR / obs-text ) of quoted-pair - tcharSet
 *
 * @see: https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.4
 * @see: https://datatracker.ietf.org/doc/html/rfc9110#appendix-A
 * @see: https://datatracker.ietf.org/doc/html/rfc5234#appendix-B.1
 */
const diffSet = new Set([
  HTAB,
  SP,
  ...charSet(0x21, 0x7e),
  ...charSet(0x80, 0xff),
]).difference(tcharSet);

const isQdTextChar = (char: string): boolean => {
  assert(char.length === 1);
  if (char === DQUOTE) return false;
  if (char === REVERSE_SOLIDUS) return false;
  return tcharSet.has(char) || diffSet.has(char);
};

const canFollowBackslash = (char: string): boolean => {
  assert(char.length === 1);
  return tcharSet.has(char) || diffSet.has(char);
};

/**
 * OWS = *( SP / HTAB )
 * @see https://datatracker.ietf.org/doc/html/rfc9110#whitespace
 */
const isOWSChar = (char: string): boolean => {
  return char === SP || char === HTAB;
};

const removeLeadingWhitespace = (str: string): string => {
  return str.replace(/^[ \t\n\r]+/u, "");
};

const removeTrailingWhitespace = (str: string): string => {
  return str.replace(/[ \t\n\r]+$/u, "");
};

const removeSurroundingWhitespace = (str: string): string => {
  return removeLeadingWhitespace(removeTrailingWhitespace(str));
};

/**
 * quoted-string   = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext          = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * quoted-pair     = "\" ( HTAB / SP / VCHAR / obs-text )
 *
 * Get *( qdtext / quoted-pair ) of "quoted-string" from input.
 *
 * @returns [string, number] if success, undefined if failure. The second element is the next position of closing DQUOTE.
 * @see https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.4
 */
const getStringInnerQuotations = (
  input: string,
  position: number
): [string, number] | undefined => {
  assert(input[position] === DQUOTE);

  let value = "";

  // Advance position by 1, which skips '"'.
  position++;

  const len = input.length;

  while (true) {
    while (position < len && isQdTextChar(input[position]!)) {
      value += input[position];
      position++;
    }

    // The end of input must be '"'.
    if (position >= len) return undefined;

    if (input[position] === DQUOTE) {
      position++;
      break;
    }

    if (input[position] !== REVERSE_SOLIDUS) {
      return undefined;
    }

    // input[position] is REVERSE_SOLIDUS.

    position++;

    if (position >= len) {
      return undefined;
    }

    if (!canFollowBackslash(input[position]!)) return undefined;

    value += input[position];
    position++;
  }

  return [value, position];
};

export interface MediaType {
  type: string;
  subtype: string;
  mediaType: string;
  parameters: Record<string, string>;
}

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
 *
 *    ABNF of parameters
 *  -----------------------------------------------------------------------
 *    parameters      = *( OWS ";" OWS [ parameter ] )
 *    parameter       = parameter-name "=" parameter-value
 *    parameter-name  = token
 *    parameter-value = ( token / quoted-string )
 *    OWS             = *( SP / HTAB )
 *  -----------------------------------------------------------------------
 *    SP = space, HTAB = horizontal tab
 *
 *  @returns MediaType if success, undefined if failure. It Parses the "media-type" strictly based on specification.
 *  @see https://datatracker.ietf.org/doc/html/rfc9110#section-8.3.1
 */
export const parseMediaType = (str: string): MediaType | undefined => {
  // [rfc9110]: https://datatracker.ietf.org/doc/html/rfc9110#section-5.5
  // A field value does not include leading or trailing whitespace.
  // When a specific version of HTTP allows such whitespace to appear in a message,
  // a field parsing implementation MUST exclude such whitespace prior to evaluating the field value.
  str = removeSurroundingWhitespace(str);

  const len = str.length;

  let position = 0;

  let type = "";
  while (position < len && isTchar(str[position]!)) {
    type += str[position];
    position++;
  }

  if (type === "" || str[position] !== "/" || position >= len) {
    return undefined;
  }

  // Advance position by 1. (This skips past U+002F (/).)
  position++;

  let subtype = "";
  while (position < len && isTchar(str[position]!)) {
    subtype += str[position];
    position++;
  }

  if (
    subtype === "" ||
    (position < len && str[position] !== ";" && !isOWSChar(str[position]!))
  ) {
    return undefined;
  }

  type = type.toLocaleLowerCase();
  subtype = subtype.toLocaleLowerCase();
  const mediaType = type + "/" + subtype;

  const result: MediaType = {
    type,
    subtype,
    mediaType,
    parameters: new Map<string, string>(),
  };

  while (position < len) {
    // skip OWS before ";"
    while (position < len && isOWSChar(str[position]!)) {
      position++;
    }

    // The end of input must not be OWS.
    // This condition is not true because of "removeSurroundingWhitespace".
    if (position >= len) {
      return undefined;
    }

    if (str[position] !== ";") {
      return undefined;
    }

    // Advance position by 1. (This skips past U+003B (;).)
    position++;

    // The end of input must not be ";".
    if (position >= len) {
      return undefined;
    }

    // skip OWS after ";"
    while (position < len && isOWSChar(str[position]!)) {
      position++;
    }

    let parameterName = "";
    while (position < len && isTchar(str[position]!)) {
      parameterName += str[position];
      position++;
    }

    if (parameterName === "" || str[position] !== "=" || position >= len) {
      return undefined;
    }

    // Set parameterName to parameterName, in ASCII lowercase.
    // parameterName is insensitive to ASCII case.
    parameterName = parameterName.toLocaleLowerCase();

    // [strict]: 11-7. Advance =.
    position++;

    // The end of input must not be "=".
    if (position >= len) {
      return undefined;
    }

    let parameterValue = "";
    // cases of quoted-string (if) and token (else)
    if (str[position] === DQUOTE) {
      const innerStringAndPosition = getStringInnerQuotations(str, position);
      if (innerStringAndPosition === undefined) {
        return undefined;
      }
      [parameterValue, position] = innerStringAndPosition;
    } else {
      while (position < len && isTchar(str[position]!)) {
        parameterValue += str[position];
        position++;
      }
      // token cannot be empty (quoted-string can be empty)
      if (parameterValue === "") {
        return undefined;
      }
    }

    if (position < len && str[position] !== ";" && !isOWSChar(str[position]!)) {
      return undefined;
    }

    // Priority logic of the same parameterName
    if (result.parameters.has(parameterName)) continue;

    result.parameters.set(parameterName, parameterValue);
  }

  return result;
};

//
// https://httpwg.org/specs/rfc9110.html#rule.parameter

//    ABNF of Accept header
//  -----------------------------------------------------------------------
//    Accept      = #( media-range [ weight ] )
//
//    media-range = ( "*/*"
//                    / ( type "/" "*" )
//                    / ( type "/" subtype )
//                  ) parameters
//  -----------------------------------------------------------------------
export const parseMediaRange = (str: string): MediaType[] | undefined => {
  // [rfc9110]: https://datatracker.ietf.org/doc/html/rfc9110#section-5.5
  // A field value does not include leading or trailing whitespace.
  // When a specific version of HTTP allows such whitespace to appear in a message,
  // a field parsing implementation MUST exclude such whitespace prior to evaluating the field value.
  str = removeSurroundingWhitespace(str);

  const len = str.length;

  let position = 0;

  const mediaRange: MediaType[] = [];

  while (position < len) {
    let type = "";
    while (position < len && isTchar(str[position]!)) {
      type += str[position];
      position++;
    }

    if (type === "" || str[position] !== "/" || position >= len) {
      return undefined;
    }

    // Advance position by 1. (This skips past U+002F (/).)
    position++;

    let subtype = "";
    while (position < len && isTchar(str[position]!)) {
      subtype += str[position];
      position++;
    }

    if (type === "*" && subtype != "*") {
      return undefined;
    }

    if (
      subtype === "" ||
      (position < len &&
        str[position] !== ";" &&
        !isOWSChar(str[position]!) &&
        str[position] !== ",")
    ) {
      return undefined;
    }

    type = type.toLocaleLowerCase();
    subtype = subtype.toLocaleLowerCase();
    const mediaType = type + "/" + subtype;

    const result: MediaType = {
      type,
      subtype,
      mediaType,
      parameters: new Map<string, string>(),
    };

    while (position < len) {
      // skip OWS before ";"
      while (position < len && isOWSChar(str[position]!)) {
        position++;
      }

      // The end of input must not be OWS.
      // This condition is not true because of "removeSurroundingWhitespace".
      if (position >= len) {
        return undefined;
      }

      if (str[position] === ",") {
        position++;
        while (position < len && isOWSChar(str[position]!)) {
          position++;
        }
        if (position >= len) {
          return undefined;
        }
        break;
      }

      if (str[position] !== ";") {
        return undefined;
      }

      // Advance position by 1. (This skips past U+003B (;).)
      position++;

      // The end of input must not be ";".
      if (position >= len) {
        return undefined;
      }

      // skip OWS after ";"
      while (position < len && isOWSChar(str[position]!)) {
        position++;
      }

      let parameterName = "";
      while (position < len && isTchar(str[position]!)) {
        parameterName += str[position];
        position++;
      }

      if (parameterName === "" || str[position] !== "=" || position >= len) {
        return undefined;
      }

      // Set parameterName to parameterName, in ASCII lowercase.
      // parameterName is insensitive to ASCII case.
      parameterName = parameterName.toLocaleLowerCase();

      // [strict]: 11-7. Advance =.
      position++;

      // The end of input must not be "=".
      if (position >= len) {
        return undefined;
      }

      let parameterValue = "";
      // cases of quoted-string (if) and token (else)
      if (str[position] === DQUOTE) {
        const innerStringAndPosition = getStringInnerQuotations(str, position);
        if (innerStringAndPosition === undefined) {
          return undefined;
        }
        [parameterValue, position] = innerStringAndPosition;
      } else {
        while (position < len && isTchar(str[position]!)) {
          parameterValue += str[position];
          position++;
        }
        // token cannot be empty (quoted-string can be empty)
        if (parameterValue === "") {
          return undefined;
        }
      }

      if (position < len && str[position] !== ";" && !isOWSChar(str[position]!)) {
        return undefined;
      }

      // Priority logic of the same parameterName
      if (result.parameters.has(parameterName)) continue;

      result.parameters.set(parameterName, parameterValue);
    }

    mediaRange.push(result);
  }

  return mediaRange;
};

/**
 * check if the given string is a valid media type
 */
export const includeMediaType = (
  mediaRange: MediaType[],
  mediaType: MediaType
): boolean => {
  return (
    mediaRange.find((m) => {
      if (m.type === "*" && m.subtype === "*") {
        return true;
      } else if (m.type === mediaType.type && m.subtype === "*") {
        return true;
      } else if (m.type === mediaType.type && m.subtype === mediaType.subtype) {
        return true;
      }
      return false;
    }) !== undefined
  );
};

/**
 * check if the given string is a valid media type
 */
export const serializeMediaType = (mediaType: MediaType): string => {
  return Object.entries(mediaType.parameters).reduce<string>(
    (acc, [key, value]) => {
      acc += ";" + key + "=" + value;
      return acc;
    },
    mediaType.mediaType
  );
};
