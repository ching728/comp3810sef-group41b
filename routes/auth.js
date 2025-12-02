const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { 
    error: null, 
    title: 'Login - Todo App',
    formData: {}
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const isJsonRequest = req.headers['content-type'] === 'application/json';
  
  try {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);
    console.log('Request type:', isJsonRequest ? 'JSON' : 'Form');
    
    if (!username || !password) {
      console.log('❌ Missing username or password');
      if (isJsonRequest) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username and password are required' 
        });
      }
      return res.render('login', { 
        error: 'Username and password are required',
        formData: { username }
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ User not found:', username);
      if (isJsonRequest) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }
      return res.render('login', { 
        error: 'Invalid credentials',
        formData: { username }
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', username);
      if (isJsonRequest) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }
      return res.render('login', { 
        error: 'Invalid credentials',
        formData: { username }
      });
    }
    
    req.session.userId = user._id;
    req.session.username = user.username;
    
    console.log('✅ Login successful:', {
      userId: user._id,
      username: user.username,
      sessionId: req.sessionID
    });
    
    if (isJsonRequest) {
      console.log('📦 Returning JSON response');
      return res.json({ 
        success: true, 
        message: 'Login successful',
        user: { 
          id: user._id, 
          username: user.username 
        },
        session: req.sessionID
      });
    } else {
      console.log('🔄 Redirecting to /tasks');
      res.redirect('/tasks');
    }
    
  } catch (err) {
    console.error('💥 LOGIN ERROR:', err);
    
    if (isJsonRequest) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server error during login' 
      });
    }
    res.render('login', { 
      error: 'Server error',
      formData: { username }
    });
  }
});

router.get('/logout', (req, res) => {
  console.log('=== LOGOUT PROCESS (GET) ===');
  console.log('Logging out user:', req.session.username);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('💥 Logout error:', err);
    } else {
      console.log('✅ Logout successful');
    }
    res.redirect('/auth/login');
  });
});

router.post('/logout', (req, res) => {
  console.log('=== LOGOUT PROCESS (POST) ===');
  console.log('Logging out user:', req.session.username);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('💥 Logout error:', err);
    } else {
      console.log('✅ Logout successful');
    }
    res.redirect('/');
  });
});

router.get('/register', (req, res) => {
  res.render('register', { 
    error: null, 
    title: 'Register - Todo App',
    formData: {}
  });
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    console.log('=== REGISTRATION PROCESS START ===');
    console.log('Registration attempt:', { 
      username, 
      passwordLength: password ? password.length : 0, 
      confirmPasswordLength: confirmPassword ? confirmPassword.length : 0 
    });

    const formData = { username };

    if (!username || !password || !confirmPassword) {
      console.log('❌ Missing fields');
      return res.render('register', { 
        error: 'All fields are required', 
        title: 'Register - Todo App',
        formData
      });
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3) {
      console.log('❌ Username too short');
      return res.render('register', { 
        error: 'Username must be at least 3 characters long', 
        title: 'Register - Todo App',
        formData
      });
    }

    if (trimmedUsername.length > 30) {
      console.log('❌ Username too long');
      return res.render('register', { 
        error: 'Username cannot exceed 30 characters', 
        title: 'Register - Todo App',
        formData
      });
    }

    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.render('register', { 
        error: 'Password must be at least 6 characters long', 
        title: 'Register - Todo App',
        formData
      });
    }

    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      return res.render('register', { 
        error: 'Passwords do not match', 
        title: 'Register - Todo App',
        formData
      });
    }

    console.log('🔍 Checking if username exists:', trimmedUsername);
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      console.log('❌ Username already exists:', trimmedUsername);
      return res.render('register', { 
        error: 'Username already exists', 
        title: 'Register - Todo App',
        formData
      });
    }

    console.log('✅ Creating new user:', trimmedUsername);
    const user = new User({ 
      username: trimmedUsername, 
      password: password 
    });
    
    console.log('💾 Saving user to database...');
    await user.save();
    console.log('✅ User created successfully. User ID:', user._id);

    req.session.userId = user._id;
    req.session.username = user.username;
    
    console.log('✅ Session set:', {
      userId: req.session.userId,
      username: req.session.username
    });
    
    console.log('🔄 Redirecting to /tasks');
    console.log('=== REGISTRATION PROCESS COMPLETED SUCCESSFULLY ===');
    
    res.redirect('/tasks');
    
  } catch (err) {
    console.error('💥 REGISTRATION ERROR:', err);
    
    let errorMessage = 'Registration failed due to server error';
    const formData = { username: req.body.username };
    
    if (err.code === 11000) {
      errorMessage = 'Username already exists';
      console.log('❌ Duplicate username error');
    } else if (err.name === 'ValidationError') {
      if (err.errors.username) {
        errorMessage = err.errors.username.message;
      } else if (err.errors.password) {
        errorMessage = err.errors.password.message;
      }
      console.log('❌ Validation error:', errorMessage);
    } else if (err.message.includes('password')) {
      errorMessage = 'Password error: ' + err.message;
    }
    
    console.log('❌ Registration failed with error:', errorMessage);
    console.log('=== REGISTRATION PROCESS FAILED ===');
    
    res.render('register', { 
      error: errorMessage, 
      title: 'Register - Todo App',
      formData
    });
  }
});

router.get('/debug', async (req, res) => {
  try {
    const users = await User.find({}, 'username createdAt');
    res.json({
      session: req.session,
      users: users,
      totalUsers: users.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
