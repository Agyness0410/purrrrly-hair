# Avatar Generator

An interactive web application for generating unique avatars using layered traits with invitation code access control.

## Features

- **Invitation Code System**: One-time use codes for access control
- **Interactive Avatar Builder**: Real-time preview while selecting traits
- **Trait Categories**: Background, Body/Clothing, Face, Hair, Hoodie, Mouth, Eyes, Accessories, Face Mask
- **Optional Traits**: Users can skip any category
- **Duplicate Prevention**: Each unique combination can only be generated once
- **Admin Panel**: Generate and manage invitation codes
- **High-Quality Output**: 1000x1000px PNG downloads

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Access the Application**
   - Main App: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## Usage

### For Administrators

1. Go to http://localhost:3000/admin
2. Generate invitation codes using the admin panel
3. Share codes with users (each code can only be used once)
4. Monitor usage statistics and view all generated codes

### For Users

1. Go to http://localhost:3000
2. Enter your invitation code
3. Select traits from different categories (or skip categories you don't want)
4. Preview your avatar in real-time
5. Once satisfied, click "Download Avatar" to get your unique avatar
6. The system prevents duplicate combinations - each avatar is unique

## File Structure

```
├── server.js              # Express server and API endpoints
├── package.json           # Dependencies and scripts
├── avatar_generator.db    # SQLite database (created automatically)
├── public/
│   ├── index.html         # Main user interface
│   ├── admin.html         # Admin panel
│   ├── style.css          # Styling
│   └── script.js          # Frontend JavaScript
└── input 2/               # Trait images organized by category and rarity
    ├── 00background/
    ├── 01body/
    ├── 02face/
    ├── 03hair/
    ├── 03body hoodie/
    ├── 04mouth/
    ├── 05eye/
    ├── 06accessory/
    └── 07facemask/
```

## Technical Details

- **Backend**: Node.js with Express
- **Database**: SQLite for invitation codes and avatar tracking
- **Image Processing**: Sharp.js for server-side image composition
- **Frontend**: Vanilla JavaScript with HTML5 Canvas for real-time preview
- **Security**: Cryptographic invitation codes with uniqueness validation

## Database Schema

### invitation_codes
- `id`: Primary key
- `code`: Unique invitation code
- `used`: Boolean flag
- `used_at`: Timestamp when used
- `created_at`: Creation timestamp

### generated_avatars
- `id`: Primary key
- `dna_hash`: Unique hash of trait combination
- `combination_data`: JSON of selected traits
- `invitation_code`: Code used to generate this avatar
- `created_at`: Creation timestamp

## API Endpoints

- `POST /admin/generate-codes` - Generate new invitation codes
- `GET /admin/codes` - Get all invitation codes
- `POST /validate-code` - Validate an invitation code
- `GET /api/traits` - Get available traits structure
- `POST /api/check-combination` - Check if combination exists
- `POST /api/generate-avatar` - Generate and download avatar

## Customization

To add new traits:
1. Place image files in the appropriate category folder under `input 2/`
2. Organize by rarity: `original`, `rare`, `super_rare`, `extraordinary`
3. Restart the server to reload trait structure

## Troubleshooting

- **"Invalid invitation code"**: Code may be already used or doesn't exist
- **"Combination already exists"**: Someone already generated this exact avatar
- **Images not loading**: Check that image files are in the correct folders
- **Server won't start**: Ensure port 3000 is available

## Support

- Supports up to 500 concurrent users
- Works with modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for desktop and mobile devices