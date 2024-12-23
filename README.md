# MIDI - Advanced Encryption and Visualization

**Version:** 1.2  
**Author:** Gas-Lighting  
**© 2024 Gas-Lighting**

---

## **Overview**

MIDI is an interactive web application that merges user input, cryptographic logic, MIDI music, and dynamic complexity factors to produce an encrypted, lossless binary image representation of your data. Unlike traditional static tools, MIDI responds to your typing speed (WPM), selected music, and customization controls, refining the encryption complexity and visual output in real-time. It also provides an explanatory "Decryption Steps" feature, offering transparency into how data transforms at each stage.

---

## **Key Enhancements in v1.2**

- **WPM Integration**: Your typing speed (Words Per Minute) affects XOR complexity, making the encryption process more challenging as you type faster. The WPM is appended to the message with zero-padding for consistency, influencing final encryption intensity.
- **Complexity Controls**: The final XOR complexity is shaped by MIDI note density, user-defined intensity scales, and your WPM factor. These combined parameters produce a unique encryption scenario each time.
- **Detailed Decryption Steps**: A "Show Decryption Steps" option reveals recorded intermediate transformations—after AES decryption, base64 decoding, and conceptual XOR reversal—helping you understand the internal logic behind the encryption pipeline.
- **Tooltips and Visual Aids**: Clear tooltips explain complex operations (e.g., note density, velocity variation) and how WPM, user scales, and XOR intensity interact. This ensures a more intuitive and educational user experience.

---

## **Features**

- **User Interaction**: Enter a custom message, and your WPM directly influences XOR complexity.
- **Encryption Key Management**: Generate or input a custom encryption key. Keep it safe.
- **MIDI Integration**: Select a MIDI track to guide XOR operations, syncing encryption events with musical notes.
- **Real-Time Visualization**: An 8x8 grid updates live, showing binary transformations at each note event.
- **Advanced Cryptography**: Leverages three-input XOR logic, AES encryption, and per-character checksums for data integrity.
- **Lossless Binary Image Generation**: Produces a high-resolution image embedding the first half of encrypted data. The second half is stored separately for enhanced security.
- **Data Management**: Clear local storage at any time to remove cached data and start fresh.
- **Guided Decryption**: The "Decryption Steps" feature and tooltips demystify the complex transformations, showing how padded WPM and XOR complexity factor into the final output.

---

## **Technical Details**

### **Encryption Process**

1. **Message & WPM**: The user’s WPM is calculated and appended (with zero-padding) to the message, forming a final plaintext: `originalMessage + "~WPM:<padded_value>"`.
2. **Complexity Calculation**: Average note density from the MIDI, user-defined XOR scale, and WPM factor combine into a `baseXORIntensity` value.
3. **Three-Input XOR & MIDI Link**: As MIDI notes play, XOR operations are repeatedly applied to the message. Grid states and WPM factor intensify these transformations.
4. **Per-Character Checksums**: Each character’s integrity is verified via checksums.
5. **Data Splitting & AES**: Encrypted data splits into two halves. The first half is embedded in the final image; the second half is stored locally. AES encryption secures the combined data.

### **Visualization**

- **8x8 Grid**: Each cell represents a bit, updating in sync with MIDI events.
- **Color Coding**:
  - **Red (on)**: True bits.
  - **Green (xor)**: Bits resulting from XOR operations.
  - **Off (default)**: False bits.
- **Animations & Highlights**: Changed bits and successfully validated characters are highlighted, providing immediate feedback on transformations.

### **Lossless Binary Image Generation**

- **High-Resolution Image**: Encodes the first half of encrypted data.
- **Secure Storage**: The second half remains in local storage, requiring combination during decryption.
- **Integrity & Security**: Without both halves and the encryption key, the original message cannot be reconstructed.

---

## **Decryption & Steps Visualization**

- **AES Decryption**: Upon loading the saved `.slayy` file and the stored second half, AES decryption retrieves the padded-wpm message.
- **Recorded Steps**: Access the “Show Decryption Steps” button to view intermediate transformations (e.g., after AES decryption, base64 decoding).
- **Tooltips**: Hover over question marks to see explanations of complexity metrics, WPM factor usage, and how XOR reversal is conceptualized.

---

## **User Interface**

- **Dark Theme**: Modern, comfortable dark UI with highlighted states and transitions.
- **Dynamic Header**: Displays encoded text and hints at complexity changes.
- **Responsive Design**: Optimized for various screen sizes and devices.
- **Interactive Elements & Tooltips**: Buttons, sliders, and icons come with short explanations, making the experience informative and accessible.
- **Footer**: Direct links to documentation (README) and controls for local storage management.

---

## **Usage Instructions**

1. **Type Your Message**: Input text in the provided textarea. The WPM is calculated automatically.
2. **Set Encryption Key**: Generate or paste a custom key.
3. **Copy Key (Optional)**: Use the "Copy Key" button to securely store the encryption key.
4. **Select a MIDI Track**: Choose from the dropdown to define note-driven XOR operations.
5. **Encrypt & Play**: Start encryption and MIDI playback with "Encrypt and Play MIDI".
6. **Observe Changes**: Watch the 8x8 grid and dynamic header respond to notes and complexity.
7. **Save Encrypted Image**: After completion, an image containing the first half of encrypted data is saved.
8. **Store the Second Half**: Securely retain the second half from local storage.
9. **Show Decryption Steps**: Click "Show Decryption Steps" to understand each transformation.
10. **Clear Local Storage**: Reset and remove cached data anytime.

---

## **Data Privacy & Security**

- **Local Processing**: All encryption/decryption happens in your browser.
- **Secure Key & Halves**: The second half and the key remain essential. Without them, data is irrecoverable.
- **No External Transmission**: Your data never leaves your device.

---

## **Disclaimer**

This application demonstrates advanced concepts in cryptography, complexity manipulation, and data visualization. It’s designed for educational and exploratory purposes and is not intended for protecting highly sensitive information.

---
For a more stenographic approach <a href="https://gaslighting.vercel.app">click me</a>
**© 2024 Gas-Lighting**
