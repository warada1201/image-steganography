// Helper to convert text to a UTF-8 binary string
function textToUTF8Binary(text: string): string {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(text); // Uint8Array
  let binaryString = '';
  utf8Bytes.forEach((byte) => {
    binaryString += byte.toString(2).padStart(8, '0');
  });
  return binaryString;
}

// Helper to convert a number to a binary string, padded to a specific bit length
function numberToBinary(num: number, bits: number): string {
  const binary = num.toString(2);
  if (binary.length > bits) {
    throw new Error(`Number ${num} is too large to fit in ${bits} bits.`);
  }
  return '0'.repeat(bits - binary.length) + binary;
}

// Helper to convert a binary string (UTF-8) to text
function binaryToUTF8Text(binaryString: string): string {
  if (binaryString.length % 8 !== 0) {
    // This indicates a potential issue with the extracted binary data or an incomplete message.
    // Depending on strictness, you might throw an error or try to process it.
    // For robustness, we'll attempt to decode what we have, but a warning might be logged.
    console.warn("Binary string length is not a multiple of 8. The message might be incomplete or corrupted.");
  }
  
  const bytes = [];
  for (let i = 0; i < binaryString.length; i += 8) {
    const byteString = binaryString.substring(i, Math.min(i + 8, binaryString.length));
    // If the last chunk is less than 8 bits, pad it or handle as error.
    // For now, we assume valid 8-bit chunks based on prior length decoding.
    if (byteString.length === 8) {
        bytes.push(parseInt(byteString, 2));
    } else {
        // Handle partial byte if necessary, or this indicates an issue.
        // For this implementation, we expect full bytes for valid characters.
        console.warn(`Encountered partial byte: ${byteString}. This part of the message may be lost.`);
    }
  }
  
  const uint8Array = new Uint8Array(bytes);
  const decoder = new TextDecoder('utf-8', { fatal: true }); // fatal: true will throw an error for invalid UTF-8 sequences
  try {
    return decoder.decode(uint8Array);
  } catch (e) {
    console.error("Failed to decode UTF-8 binary string:", e);
    throw new Error("Failed to decode message: Invalid UTF-8 sequence detected. The data might be corrupted or not valid text.");
  }
}


export const encodeTextInImage = async (
  imageFile: File,
  text: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (eventReader) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const MAX_CANVAS_AREA = 4096 * 4096; 
        if (canvas.width * canvas.height > MAX_CANVAS_AREA) {
            reject(new Error(`Image dimensions (${img.width}x${img.height}) are too large for encoding. Please use a smaller image.`));
            return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error('Failed to get canvas context for encoding. This may be due to image size or browser limitations.'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            reject(new Error(`Failed to get image data for encoding. The image might be too large or from a restricted origin. Error: ${(e as Error).message}`));
            return;
        }
        
        const data = imageData.data; 

        const secretMessageBinary = textToUTF8Binary(text);
        const messageLengthBinary = numberToBinary(secretMessageBinary.length, 32); 
        const fullBinaryPayload = messageLengthBinary + secretMessageBinary;

        const maxEmbeddableBits = Math.floor((data.length / 4) * 3); 
        if (fullBinaryPayload.length > maxEmbeddableBits) {
          reject(
            new Error(
              `Text is too long to embed in this image. Max ${maxEmbeddableBits} bits available, message requires ${fullBinaryPayload.length} bits. (Message starts with: '${text.substring(0,10)}...', length ${text.length})`
            ),
          );
          return;
        }

        let dataIndex = 0; 
        let payloadIndex = 0; 

        while(payloadIndex < fullBinaryPayload.length) {
            if (dataIndex >= data.length) {
                reject(new Error('Encoding error: Ran out of image data space unexpectedly. This usually means a miscalculation in capacity.'));
                return;
            }
            if (dataIndex % 4 !== 3) { // Skip Alpha channel
                const bitToEmbed = parseInt(fullBinaryPayload[payloadIndex], 10);
                data[dataIndex] = (data[dataIndex] & 0xFE) | bitToEmbed;
                payloadIndex++;
            }
            dataIndex++;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png')); 
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for encoding. The file might be corrupted or an unsupported format.'));
      };

      if (eventReader.target?.result && typeof eventReader.target.result === 'string') {
        img.src = eventReader.target.result;
      } else {
        reject(new Error('Failed to read image file content for encoding.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader failed to read the image file for encoding.'));
    };

    if (imageFile) {
      reader.readAsDataURL(imageFile);
    } else {
      reject(new Error('No image file provided to encoding service.'));
    }
  });
};

export const decodeTextFromImage = async (
  imageFile: File,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (eventReader) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const MAX_CANVAS_AREA = 4096 * 4096; // Consistent with encoding
        if (canvas.width * canvas.height > MAX_CANVAS_AREA) {
            reject(new Error(`Image dimensions (${img.width}x${img.height}) are too large for decoding. Please use a smaller image.`));
            return;
        }
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Failed to get canvas context for decoding. This may be due to image size or browser limitations.'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            reject(new Error(`Failed to get image data for decoding. The image might be too large or from a restricted origin. Error: ${(e as Error).message}`));
            return;
        }

        const data = imageData.data;
        const totalAvailableBits = Math.floor((data.length / 4) * 3);

        if (totalAvailableBits < 32) {
          reject(new Error('Image is too small to contain any message (cannot even store message length).'));
          return;
        }

        let extractedLengthBinary = '';
        let dataIndex = 0;
        let bitsReadForLength = 0;

        while(bitsReadForLength < 32) {
            if (dataIndex >= data.length) {
                reject(new Error('Decoding error: Ran out of image data while reading message length. Image may be corrupted or not a steganographic image.'));
                return;
            }
            if (dataIndex % 4 !== 3) { // Skip Alpha
                extractedLengthBinary += (data[dataIndex] & 1).toString();
                bitsReadForLength++;
            }
            dataIndex++;
        }
        
        const messageLength = parseInt(extractedLengthBinary, 2);

        if (messageLength === 0) {
          resolve(''); // No message embedded or length is zero
          return;
        }
        
        if (messageLength < 0) { // Should not happen with unsigned binary, but good check
            reject(new Error(`Invalid message length extracted: ${messageLength}. Data might be corrupted.`));
            return;
        }

        const remainingBitsInImage = totalAvailableBits - 32;
        if (messageLength > remainingBitsInImage) {
          reject(
            new Error(
              `Declared message length (${messageLength} bits) exceeds available space in image (${remainingBitsInImage} bits remaining). The image might be corrupted or not contain the full message.`
            ),
          );
          return;
        }
        
        let extractedMessageBinary = '';
        let bitsReadForMessage = 0;

        while(bitsReadForMessage < messageLength) {
            if (dataIndex >= data.length) {
                reject(new Error(`Decoding error: Ran out of image data while reading message. Expected ${messageLength} bits, got ${bitsReadForMessage}. Image may be corrupted.`));
                return;
            }
             if (dataIndex % 4 !== 3) { // Skip Alpha
                extractedMessageBinary += (data[dataIndex] & 1).toString();
                bitsReadForMessage++;
            }
            dataIndex++;
        }

        try {
            const decodedText = binaryToUTF8Text(extractedMessageBinary);
            resolve(decodedText);
        } catch (e) {
            reject(e); // Propagate error from binaryToUTF8Text (e.g., invalid UTF-8)
        }

      };

      img.onerror = () => {
        reject(new Error('Failed to load image for decoding. The file might be corrupted or an unsupported format.'));
      };
      
      if (eventReader.target?.result && typeof eventReader.target.result === 'string') {
        img.src = eventReader.target.result;
      } else {
        reject(new Error('Failed to read image file content for decoding.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader failed to read the image file for decoding.'));
    };
    
    if (imageFile) {
      reader.readAsDataURL(imageFile);
    } else {
      reject(new Error('No image file provided to decoding service.'));
    }
  });
};
