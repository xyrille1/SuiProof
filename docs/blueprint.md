# **App Name**: SuiProof

## Core Features:

- Press Pass Verification: Verify user identity and permissions using Slush Wallet's zkLogin and institutional press pass objects, limiting minting capabilities to authorized journalists.
- Hardware-Level Hashing: Securely generate BLAKE2b hashes of media directly from the device's Trusted Execution Environment (TEE) to ensure content integrity.
- Metadata Bundling: Automatically include immutable metadata such as GPS coordinates, UTC timestamp, and device ID within each on-chain manifest.
- Object-Centric Lineage Tracking: Establish parent-child relationships between original media and authorized edits to maintain a transparent and verifiable content lineage.
- Public Audit API: Enable a public verification interface allowing users to verify the authenticity of media by checking its hash against the Sui Network.
- Content Authenticity Determination: The app analyzes user-uploaded content, cross-referencing its hash and metadata against the Sui blockchain. The app determines whether the media possesses a valid SuiProof manifest. If not, the application alerts users, indicating potential authenticity concerns, and prompts heightened caution in further interactions with the content.
- Sponsored Transactions: Implement transaction sponsoring, enabling news agencies to cover gas fees for journalists, streamlining the anchoring process and eliminating the need for users to hold SUI tokens.

## Style Guidelines:

- Primary color: A vibrant blue (#4da2ff) to convey trust and reliability, drawing inspiration from the Sui Network's branding. This color is reminiscent of established tech brands.
- Background color: Light, desaturated blue (#E6F0FF) to provide a clean and trustworthy backdrop that complements the primary blue. Provides subtle contrast, avoiding harshness.
- Accent color: A teal (#32629b), approximately 30 degrees to the 'left' of the primary hue on the color wheel, adding depth and a high-tech feel to key interactive elements such as buttons and links. Chosen for depth.
- Body and headline font: 'Inter', a grotesque-style sans-serif, providing a modern, machined, objective, neutral, and readable look, suitable for both headlines and body text.
- Code font: 'Source Code Pro' for displaying blockchain-related IDs and technical metadata.
- Use simple, outlined icons from Font Awesome to maintain a clean and modern interface.
- Subtle animations, such as the 'pulse' effect on verified content indicators, to provide dynamic feedback without being distracting.