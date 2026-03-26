const fs = require('fs');
const path = require('path');

const cloudinary = require('cloudinary').v2

const CLOUD_NAME = "posteritapos";
const API_KEY = "989526516919795";
const API_SECRET = "YgehHeVxqIPjIoqRGHCNKZV8j4s";
const UPLOAD_PRESET = "ml_default";
const ROOT_FOLDER = "offline-repo/restaurant-client"; // Root folder on Cloudinary

const SRC_PATH = path.join(__dirname, "release");

cloudinary.config({ 
    cloud_name: CLOUD_NAME, 
    api_key: API_KEY, 
    api_secret: API_SECRET,
    secure: true
});

let timestamp = Math.floor(Date.now() / 1000);

// Function to upload a single file to Cloudinary
async function uploadFile(filePath, cloudinaryFolder) {
    if (fs.statSync(filePath).isFile()) {
        let p = path.parse(filePath);
		
        const fileName = p.base;
        const publicId = p.name; // Add folder structure to public ID

        console.log(`cloudinaryFolder: ${cloudinaryFolder}, public_id: ${publicId} `);        

        cloudinary.uploader.upload(filePath, {
            resource_type: "auto", 
            public_id: publicId,
            folder: cloudinaryFolder, // Use dynamic folder
            invalidate: "true",
            timestamp: timestamp,
            upload_preset: UPLOAD_PRESET
        }, (error, result) => {
            console.log(result, error);
        });
        
    }
}

// Function to recursively upload a folder
async function uploadFolder(folderPath, cloudinaryFolder) {
    const files = fs.readdirSync(folderPath);
    files.forEach((file) => {
        const filePath = path.join(folderPath, file);
        const fileStats = fs.statSync(filePath);

        if (fileStats.isFile()) {
            // If it's a file, upload it
            uploadFile(filePath, cloudinaryFolder);
        } else if (fileStats.isDirectory()) {
            // If it's a folder, recurse into it
            const newCloudinaryFolder = path.join(cloudinaryFolder, file); // Update folder path for Cloudinary
            uploadFolder(filePath, newCloudinaryFolder); // Recurse into subfolder
        }
    });
}

async function upload() {
    timestamp = Math.floor(Date.now() / 1000);
    console.log(`Timestamp [${timestamp}]`);

    uploadFolder(SRC_PATH, ROOT_FOLDER); // Start recursive upload from the root
}

upload();
