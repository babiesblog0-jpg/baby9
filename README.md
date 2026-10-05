# Baby Food CMS - Dynamic Web Application

A complete dynamic web application for managing baby food recipes and parenting blogs with a secure admin panel.

## Features

### 🔐 Authentication & Security
- Secure user login with JWT tokens
- Password hashing with bcryptjs
- Role-based access control (Admin, Editor)
- Token-based API authentication

### 👶 Baby Food Management
- Create, read, update, delete baby food recipes
- Support for multiple age groups (6 months - 3 years)
- Ingredient and instruction management
- Nutrition information tracking
- Image uploads for food items
- Category-based organization

### 📝 Blog Management
- Create, read, update, delete blog posts
- Rich text editor support
- Category tagging system
- Featured image uploads
- Published/draft status
- View count tracking
- Author information

### 📂 Category Management
- Create and manage food categories
- Age group specific categorization
- Image uploads for categories
- Organize recipes by type

### 🎨 Admin Panel
- User-friendly dashboard
- Real-time statistics
- Intuitive forms for content management
- Image preview before upload
- WYSIWYG rich text editor
- Responsive design

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Multer** - File uploads
- **Bcryptjs** - Password hashing
- **CORS** - Cross-origin requests

### Frontend (Admin Panel)
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API for HTTP requests

## Installation & Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or cloud instance)
- npm or yarn

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/baby-food-cms
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
ADMIN_EMAIL=admin@babyfood.com
ADMIN_PASSWORD=Admin@123456
```

### 3. Seed Initial Data
```bash
npm run seed
```

This creates:
- Admin user (admin@babyfood.com / Admin@123456)
- Default categories (Fruits, Vegetables, Grains, Proteins, Dairy)

### 4. Start the Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on: `http://localhost:5000`

### 5. Access Admin Panel
Open in your browser:
```
http://localhost:5000/admin/index.html
```

Login with:
- Email: `admin@babyfood.com`
- Password: `Admin@123456`

## API Endpoints

### Authentication
```
POST   /api/auth/register       - Register new user
POST   /api/auth/login          - Login user
GET    /api/auth/me             - Get current user (protected)
POST   /api/auth/logout         - Logout user
```

### Baby Foods
```
GET    /api/baby-foods          - Get all baby foods
GET    /api/baby-foods/:id      - Get specific baby food
POST   /api/baby-foods          - Create baby food (auth required)
PUT    /api/baby-foods/:id      - Update baby food (auth required)
DELETE /api/baby-foods/:id      - Delete baby food (auth required)
```

Query Parameters:
- `ageGroup` - Filter by age group
- `category` - Filter by category ID
- `isActive` - Filter by active status

### Blogs
```
GET    /api/blogs               - Get all blog posts
GET    /api/blogs/:id           - Get specific blog post
POST   /api/blogs               - Create blog post (auth required)
PUT    /api/blogs/:id           - Update blog post (auth required)
DELETE /api/blogs/:id           - Delete blog post (auth required)
```

Query Parameters:
- `category` - Filter by category
- `isPublished` - Filter by publication status
- `tags` - Filter by tags (comma-separated)

### Categories
```
GET    /api/categories          - Get all categories
GET    /api/categories/:id      - Get specific category
POST   /api/categories          - Create category (admin required)
PUT    /api/categories/:id      - Update category (admin required)
DELETE /api/categories/:id      - Delete category (admin required)
```

## Database Models

### User
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  name: String (required),
  role: String (admin, editor),
  isActive: Boolean,
  timestamps: Date
}
```

### BabyFood
```javascript
{
  title: String,
  description: String,
  ingredients: [String],
  instructions: String,
  ageGroup: String (6 months, 8 months, etc.),
  category: ObjectId (ref: Category),
  image: String (file path),
  prepTime: Number,
  servings: Number,
  nutritionInfo: {
    calories: Number,
    protein: String,
    carbs: String,
    fat: String
  },
  isActive: Boolean,
  createdBy: ObjectId (ref: User),
  timestamps: Date
}
```

### Blog
```javascript
{
  title: String,
  content: String (HTML),
  excerpt: String,
  author: ObjectId (ref: User),
  featuredImage: String (file path),
  category: String (nutrition, recipes, parenting, health, development),
  tags: [String],
  isPublished: Boolean,
  publishedDate: Date,
  views: Number,
  timestamps: Date
}
```

### Category
```javascript
{
  name: String (unique),
  description: String,
  ageGroup: String (6 months, 8 months, 1 year, 2 years, 3 years, all),
  image: String (file path),
  isActive: Boolean,
  timestamps: Date
}
```

## File Structure

```
backend/
├── admin/                    # Admin Panel Frontend
│   ├── index.html           # Admin dashboard HTML
│   ├── css/
│   │   └── style.css        # Admin styles
│   └── js/
│       └── app.js           # Admin JavaScript
├── config/
│   └── database.js          # MongoDB connection
├── controllers/             # Request handlers
│   ├── authController.js
│   ├── babyFoodController.js
│   ├── blogController.js
│   └── categoryController.js
├── middleware/              # Custom middleware
│   ├── auth.js             # JWT authentication
│   └── upload.js           # File upload handling
├── models/                  # Database schemas
│   ├── User.js
│   ├── BabyFood.js
│   ├── Blog.js
│   └── Category.js
├── routes/                  # API routes
│   ├── authRoutes.js
│   ├── babyFoodRoutes.js
│   ├── blogRoutes.js
│   └── categoryRoutes.js
├── uploads/                 # Uploaded files storage
├── server.js               # Main server file
├── seed.js                 # Database seeding
├── package.json
├── .env
└── .gitignore
```

## Usage Examples

### Login
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@babyfood.com",
  "password": "Admin@123456"
}
```

### Create Baby Food
```javascript
POST /api/baby-foods
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Apple Puree",
  "description": "Simple and nutritious apple puree",
  "ingredients": "2 apples,1 tbsp water",
  "instructions": "Peel and dice apples. Steam for 5 minutes. Blend with water.",
  "ageGroup": "6 months",
  "category": "<category_id>",
  "prepTime": 15,
  "servings": 2,
  "image": <file>
}
```

### Create Blog Post
```javascript
POST /api/blogs
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Introduction to Baby Foods",
  "content": "<p>Starting baby on solids...</p>",
  "excerpt": "Learn about introducing baby food",
  "category": "nutrition",
  "tags": "baby,nutrition,solids",
  "isPublished": true,
  "featuredImage": <file>
}
```

## Security Considerations

1. **JWT Tokens**: Use strong secret keys in production
2. **Password Hashing**: All passwords are hashed with bcryptjs
3. **File Uploads**: Only image files are allowed (jpeg, jpg, png, gif)
4. **File Size**: 5MB maximum file size limit
5. **CORS**: Configure CORS properly for production
6. **Environment Variables**: Never commit .env file
7. **Database**: Use MongoDB connection strings with authentication

## Frontend Integration

The admin panel can be accessed at:
```
http://localhost:5000/admin/index.html
```

For public frontend integration, update frontend API calls to point to your backend:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';

// Get all baby foods
fetch(API_BASE_URL + '/baby-foods')
  .then(res => res.json())
  .then(data => console.log(data.data));

// Get published blogs
fetch(API_BASE_URL + '/blogs?isPublished=true')
  .then(res => res.json())
  .then(data => console.log(data.data));
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify network access if using MongoDB Atlas

### Image Upload Not Working
- Check uploads folder exists and is writable
- Verify file size is under 5MB
- Ensure file is a valid image format

### Admin Panel Blank
- Clear browser cache
- Check browser console for errors
- Verify API is running on correct port
- Check CORS settings

## Future Enhancements

- [ ] Email notifications
- [ ] User profile management
- [ ] Advanced analytics
- [ ] Multiple language support
- [ ] SEO optimization
- [ ] Mobile app
- [ ] Recipe rating system
- [ ] User comments on blogs

## License

MIT License

## Support

For issues and questions, please check the documentation or contact support.
