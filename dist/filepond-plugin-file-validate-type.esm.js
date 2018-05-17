/*
 * FilePondPluginFileValidateType 1.1.0
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */
var plugin$1 = ({ addFilter, utils }) => {
  // get quick reference to Type utils
  const {
    Type,
    isString,
    replaceInString,
    guesstimateMimeType,
    getExtensionFromFilename,
    getFilenameFromURL
  } = utils;

  const mimeTypeMatchesWildCard = (mimeType, wildcard) => {
    const mimeTypeGroup = (/^[^/]+/.exec(mimeType) || []).pop(); // image/png -> image
    const wildcardGroup = wildcard.slice(0, -2); // image/* -> image
    return mimeTypeGroup === wildcardGroup;
  };

  const isValidMIMEType = (acceptedTypes, userInputType) =>
    acceptedTypes.some(acceptedType => {
      // accepted is wildcard mime type
      if (/\*$/.test(acceptedType)) {
        return mimeTypeMatchesWildCard(userInputType, acceptedType);
      }

      // is normal mime type
      return acceptedType === userInputType;
    });

  const validateFile = (item, acceptedFileTypes) => {
    // no types defined, everything is allowed \o/
    if (acceptedFileTypes.length === 0) {
      return true;
    }

    // if the item is a url we guess the mime type by the extension
    let type = '';
    if (isString(item)) {
      const filename = getFilenameFromURL(item);
      const extension = getExtensionFromFilename(filename);
      if (extension) {
        type = guesstimateMimeType(extension);
      } else {
        return true;
      }
    } else {
      type = item.type;
    }

    // validate file type
    return isValidMIMEType(acceptedFileTypes, type);
  };

  const applyMimeTypeMap = map => acceptedFileType =>
    map[acceptedFileType] === null
      ? false
      : map[acceptedFileType] || acceptedFileType;

  // setup attribute mapping for accept
  addFilter('SET_ATTRIBUTE_TO_OPTION_MAP', map =>
    Object.assign(map, {
      accept: 'acceptedFileTypes'
    })
  );

  // filtering if an item is allowed in hopper
  addFilter('ALLOW_HOPPER_ITEM', (file, { query }) => {
    // if we are not doing file type validation exit
    if (!query('GET_ALLOW_FILE_TYPE_VALIDATION')) {
      return true;
    }

    // we validate the file against the accepted file types
    return validateFile(file, query('GET_ACCEPTED_FILE_TYPES'));
  });

  // called for each file that is loaded
  // right before it is set to the item state
  // should return a promise
  addFilter(
    'LOAD_FILE',
    (file, { query }) =>
      new Promise((resolve, reject) => {
        const allowFileTypeValidation = query('GET_ALLOW_FILE_TYPE_VALIDATION');
        if (!allowFileTypeValidation) {
          resolve(file);
          return;
        }

        const acceptedFileTypes = query('GET_ACCEPTED_FILE_TYPES');

        // if invalid, exit here
        if (!validateFile(file, acceptedFileTypes)) {
          const acceptedFileTypesMapped = acceptedFileTypes
            .map(
              applyMimeTypeMap(
                query('GET_FILE_VALIDATE_TYPE_LABEL_EXPECTED_TYPES_MAP')
              )
            )
            .filter(label => label !== false);

          reject({
            status: {
              main: query('GET_LABEL_FILE_TYPE_NOT_ALLOWED'),
              sub: replaceInString(
                query('GET_FILE_VALIDATE_TYPE_LABEL_EXPECTED_TYPES'),
                {
                  allTypes: acceptedFileTypesMapped.join(', '),
                  allButLastType: acceptedFileTypesMapped
                    .slice(0, -1)
                    .join(', '),
                  lastType:
                    acceptedFileTypesMapped[acceptedFileTypesMapped.length - 1]
                }
              )
            }
          });
          return;
        }

        // all fine
        resolve(file);
      })
  );

  // expose plugin
  return {
    // default options
    options: {
      // Enable or disable file type validation
      allowFileTypeValidation: [true, Type.BOOLEAN],

      // What file types to accept
      acceptedFileTypes: [[], Type.ARRAY],
      // - must be comma separated
      // - mime types: image/png, image/jpeg, image/gif
      // - extensions: .png, .jpg, .jpeg ( not enabled yet )
      // - wildcards: image/*

      // label to show when a type is not allowed
      labelFileTypeNotAllowed: ['File is of invalid type', Type.STRING],

      // nicer label
      fileValidateTypeLabelExpectedTypes: [
        'Expects {allButLastType} or {lastType}',
        Type.STRING
      ],

      // map mime types to extensions
      fileValidateTypeLabelExpectedTypesMap: [{}, Type.OBJECT]
    }
  };
};

if (typeof navigator !== 'undefined' && document) {
  // plugin has loaded
  document.dispatchEvent(
    new CustomEvent('FilePond:pluginloaded', { detail: plugin$1 })
  );
}

export default plugin$1;
