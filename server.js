// Server-side Changes (server.js)
const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer')

const app = express();
const port = 3000;

// PostgreSQL connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'ic7',
  port: 5432,
});

// Configure sessions
app.use(session({
  secret: 'mySecret', // Change this to a secure secret in production
  resave: false,
  saveUninitialized: true
}));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Function to create tables if they don't exist
async function createTables() {
  try {
    const client = await pool.connect();

    // Create users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        fullname VARCHAR(255),
        occupation VARCHAR(255),
        workplace VARCHAR(255),
        birthday VARCHAR(255),
        contactnumber VARCHAR(255),
        address VARCHAR(255),
        username VARCHAR(255),
        profilepic VARCHAR(255)
      )
    `);

    console.log('Users table created successfully.');

    // Add additional table creation logic as needed

    client.release();
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error; // Rethrow the error to stop server startup in case of table creation failure
  }
}

// Call the createTables function when the server starts
createTables()
  .then(() => {
    // Start the server only after successful table creation
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
  });

// Endpoint to handle signup form submission
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  console.log('Received signup request with email:', email);

  try {
    // Check if email and password fields are provided
    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }

    // Insert user into the database
    const result = await pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id', [email, password]);

    // Store user ID in session
    req.session.userId = result.rows[0].id;

    // Redirect to the profile creation page
    res.redirect('/profile_creation.html');
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('An error occurred while signing up.');
  }
});

// Define storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    // Create 'profiles' folder if not exists
    const profileDir = path.join(__dirname, 'profiles');
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir);
    }
    callback(null, profileDir);
  },
  filename: (req, file, callback) => {
    // Generate unique filename for each uploaded file
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'profile_' + uniqueSuffix + ext;
    callback(null, filename);
  }
});

// Initialize multer with storage
const uploadProfile = multer({ storage: profileStorage }).single('profilepic');

// Endpoint to handle profile creation form submission
app.post('/profile_creation', uploadProfile, async (req, res) => {
  const { fullname, occupation, workplace, birthday, contactnumber, address, username} = req.body;
  const userId = req.session.userId;
  const profilepic = req.file ? req.file.filename : null; // Get the filename if file uploaded
  console.log('Profile Pic:', profilepic); // Check the value of profilepic

  try {
    // Check if the provided username already exists in the database
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 AND id != $2', [username, userId]);
    console.log('Existing user:', existingUser.rows);

    if (existingUser.rows.length > 0) {
      console.log('Username already exists');
      // Render the profile creation page again with a warning message
      return res.status(200).sendFile(path.join(__dirname, 'public', 'profile.html'), { warning: 'Username already exists. Please choose a different one.' });
    }

    // Build the SET clause dynamically based on provided data
    const setValues = [];
    const setParams = [];

    if (fullname) {
      setValues.push('fullname = $1');
      setParams.push(fullname);
    }
    if (occupation) {
      setValues.push('occupation = $2');
      setParams.push(occupation);
    }
    if (workplace) {
      setValues.push('workplace = $3');
      setParams.push(workplace);
    }
    if (birthday) {
      setValues.push('birthday = $4');
      setParams.push(birthday);
    }
    if (contactnumber) {
      setValues.push('contactnumber = $5');
      setParams.push(contactnumber);
    }
    if (address) {
      setValues.push('address = $6');
      setParams.push(address);
    }
    if (username) {
      setValues.push('username = $7');
      setParams.push(username);
    }
    if (profilepic) {
      setValues.push('profilepic = $8');
      setParams.push(profilepic);
    }

    // Update user record in the database with additional details
    const updateQuery = `UPDATE users SET ${setValues.join(', ')} WHERE id = $${setParams.length + 1}`;
    const result = await pool.query(updateQuery, [...setParams, userId]);

    // Redirect to the account page after profile creation
    res.redirect('/account');
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('An error occurred while creating profile.');
  }
});

// Endpoint to handle login form submission
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if email and password fields are provided
    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }

    // Query the database to find the user with the provided email and password
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);

    // Check if user exists
    if (result.rows.length === 0) {
      return res.status(401).send('Invalid email or password.');
    }

    // Store user ID in session
    req.session.userId = result.rows[0].id;

    // Redirect to the next page (e.g., user's account interface)
    res.redirect('/account');
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('An error occurred while logging in.');
  }
});

// Middleware function to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    // User is authenticated, proceed to the next middleware or route handler
    next();
  } else {
    // User is not authenticated, redirect to the login page
    res.redirect('/login');
  }
};

// Route for serving the user's account interface page
app.get('/account', isAuthenticated, (req, res) => {
  // Retrieve user-specific data from the session
  const userId = req.session.userId;

  // Use the user ID to fetch user-specific content from the database
  // Render the account interface page with the fetched content
  res.sendFile(path.join(__dirname, 'public', 'home.html'));

});

// Route for serving the profile interface page
app.get('/profile', isAuthenticated, (req, res) => {
  // Retrieve user-specific data from the session
  const userId = req.session.userId;

  // Use the user ID to fetch user-specific content from the database
  // Render the profile interface page with the fetched content
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Endpoint to handle requests for APK files based on category
app.get('/apk/:category', (req, res) => {
  const { category } = req.params;
  const apkDirectory = path.join(__dirname, 'apk', category);

  fs.readdir(apkDirectory, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      res.status(500).send('Internal server error.');
    } else {
      const apkFiles = files.filter(file => file.endsWith('.apk'));
      res.json(apkFiles);
    }
  });
});

// Default route handler for the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sign_in.html'));
});

// Default route handler for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});


// Endpoint to retrieve the current user's details
app.get('/user-details', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).send('User not found.');
    }

    const user = result.rows[0];
    res.json(user);
  } catch (error) {
    console.error('Error retrieving user details:', error);
    res.status(500).send('Internal server error.');
  }
});




// Endpoint to handle login form submission
app.post('/forkplussignup_forkaccount', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if email and password fields are provided
    if (!email || !password) {
      return res.status(400).send('Account was not found.');
    }

    // Query the database to find the user with the provided email and password
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);

    // Check if user exists
    if (result.rows.length === 0) {
      return res.status(401).send('Invalid email or password.');
    }

    // Store user ID in session
    req.session.userId = result.rows[0].id;

    // Redirect to the next page (e.g., user's account interface)
    res.redirect('/catalog_fp.html');
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('An error occurred while logging in.');
  }
});

// Default route handler for the login page
app.get('/forkplussignup_forkaccount', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sign_upfp_existing.html'));
});

app.post('/forkplussignup_forkaccount', (req, res) => {
  // Handle the POST request here
  res.send('POST request to /forkplussignup_forkaccount');
});











// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadFolder = 'uploads/';
        // Check if the uploads folder exists, if not, create it
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder);
        }
        cb(null, uploadFolder);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname) // Unique filename for each uploaded file
    }
});
const upload = multer({ storage: storage });

// Function to create the table if it doesn't exist
async function createTableIfNotExists() {
    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS uploaded_apks (
                id SERIAL PRIMARY KEY,
                apk_name VARCHAR(255) NOT NULL,
                apk_version VARCHAR(50) NOT NULL,
                required_os VARCHAR(50) NOT NULL,
                file_size VARCHAR(20) NOT NULL,
                category VARCHAR(50) NOT NULL,
                apk_filename VARCHAR(255) NOT NULL,
                thumb_filename VARCHAR(255) NOT NULL,
                user_id INT NOT NULL
            )
        `);
        console.log('Table created or already exists.');
        client.release();
    } catch (error) {
        console.error('Error creating table:', error);
    }
}

// Call the createTableIfNotExists function when the server starts
createTableIfNotExists();

// Handle file upload POST request
app.post('/upload', upload.fields([{ name: 'apkfile', maxCount: 1 }, { name: 'apkthumb', maxCount: 1 }]), async (req, res) => {
    try {
        // Retrieve form data
        const { apkname, apkver, reqrdos, filesize, category } = req.body;
        const { apkfile, apkthumb } = req.files;

        const file_size = req.body.filesize;


        // Insert data into PostgreSQL table
        const result = await pool.query('INSERT INTO uploaded_apks (apk_name, apk_version, required_os, file_size, category, apk_filename, thumb_filename, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [apkname, apkver, reqrdos, filesize, category, apkfile[0].filename, apkthumb[0].filename, req.session.userId]);

         // Redirect to the catalog page with a success query parameter
         res.redirect('/catalog_fp.html');
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('An error occurred while uploading the file.');
    }
});

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));







// Assuming you're using Express.js
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
          console.error('File does not exist:', err);
          return res.status(404).send('File not found');
      }

      // If the file exists, initiate the download
      res.download(filePath, (err) => {
          if (err) {
              console.error('Error downloading file:', err);
              return res.status(500).send('Internal Server Error');
          }
          console.log('File successfully downloaded');
      });
  });
});



















// Endpoint to retrieve the current user's uploaded works
app.get('/user-works', isAuthenticated, async (req, res) => {
  try {
    // Retrieve user ID from session
    const userId = req.session.userId;

    // Query the database to fetch the user's uploaded works
    const result = await pool.query('SELECT * FROM uploaded_apks WHERE user_id = $1', [userId]);

    // Send the uploaded works as JSON response
    res.json(result.rows);
  } catch (error) {
    console.error('Error retrieving user\'s uploaded works:', error);
    res.status(500).send('Internal server error.');
  }
});







// Endpoint to retrieve apps grouped by category
app.get('/apps-by-category', async (req, res) => {
  try {
      // Fetch apps from the database grouped by category
      const appsByCategory = await fetchAppsByCategory(); // Implement this function to fetch apps grouped by category

      // Send the grouped apps as JSON response
      res.json(appsByCategory);
  } catch (error) {
      console.error('Error fetching apps by category:', error);
      res.status(500).send('An error occurred while fetching apps by category.');
  }
});






async function fetchAppsByCategory() {
  try {
    // Connect to the database
    const client = await pool.connect();

    // Query to fetch apps grouped by category
    const query = `
    SELECT category, array_agg(id) as ids, array_agg(apk_name) as apk_names, array_agg(apk_version) as apk_versions, array_agg(thumb_filename) as thumb_filenames
    FROM uploaded_apks
    GROUP BY category;    
    `;

    // Execute the query
    const result = await client.query(query);

    // Release the client back to the pool
    client.release();

    // Format the result into the desired structure
    const appsByCategory = {};
    result.rows.forEach(row => {
      const category = row.category;
      appsByCategory[category] = [];
      for (let i = 0; i < row.ids.length; i++) {
        appsByCategory[category].push({
          id: row.ids[i],
          apk_name: row.apk_names[i],
          apk_version: row.apk_versions[i],
          thumb_filename: row.thumb_filenames[i], // Add this line to include the thumbnail filename
          thumb_url: `/uploads/${row.thumb_filenames[i]}` // Construct the URL for the thumbnail image
        });
        
      }
    });

    return appsByCategory;
  } catch (error) {
    throw new Error(`Error fetching apps by category: ${error.message}`);
  }
}



















// Route to handle fetching app details by ID
app.get('/app-details/:appId', async (req, res) => {
  try {
    // Extract the appId from the request parameters
    const { appId } = req.params;

    // Query to fetch app details from PostgreSQL, including username
    const query = {
      text: `
        SELECT 
          apk_name, 
          apk_version,
          file_size,
          required_os, 
          category, 
          user_id,
          apk_filename,
          u.username AS username, 
          thumb_filename 
        FROM 
          uploaded_apks AS a
        JOIN 
          users AS u 
        ON 
          a.user_id = u.id
        WHERE 
          a.id = $1
      `,
      values: [appId],
    };

    // Execute the query
    const result = await pool.query(query);

    // Send the app details as JSON response
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('App details not found');
    }
  } catch (error) {
    console.error('Error fetching app details:', error);
    res.status(500).send('An error occurred while fetching app details.');
  }
});







async function showAppDetails(appId, event) {
  event.preventDefault(); // Prevent the default action of the anchor tag
  console.log('App ID:', appId); // Check if the correct app ID is received
  try {
      // Fetch app details from the server
      const response = await fetch(`/app-details/${appId}`);
      console.log('Response:', response); // Log the response from the server
      const appDetails = await response.json();
      console.log('App Details:', appDetails); // Log the app details received from the server

      // Construct the content of the pop-up window
      const popupContent = `
          <h2>${appDetails.apk_name} (Version: ${appDetails.apk_version})</h2>
          <p>Category: ${appDetails.category}</p>
          <p>Creator: ${appDetails.username}</p>
          <button onclick="downloadApp('${appDetails.apk_filename}')">Download</button>
      `;

      // Create a modal for showing app details
      const modal = document.createElement('div');
      modal.classList.add('modal');
      modal.innerHTML = `
          <div class="modal-content">
              ${popupContent}
          </div>
      `;
      console.log('Modal:', modal); // Log the modal element
      document.body.appendChild(modal);

      // Display the modal
      modal.style.display = 'block';

      // Close the modal when clicking outside of it
      window.onclick = function(event) {
          if (event.target === modal) {
              modal.style.display = 'none';
              document.body.removeChild(modal);
          }
      };
  } catch (error) {
      console.error('Error fetching app details:', error);
  }
}


