## Frontend Integration Guide

This guide shows how to integrate your existing React frontend with the Baby Food CMS backend.

### 1. Install Backend API Utility

Add the `api.js` file to your React project or copy the `BabyFoodAPI` class:

```javascript
import BabyFoodAPI from './api/BabyFoodAPI';

// Initialize API
const api = new BabyFoodAPI('http://localhost:5000/api');
```

### 2. Display Baby Foods on Frontend

#### Get All Baby Foods
```javascript
async function loadBabyFoods() {
  try {
    const response = await api.getBabyFoods({
      isActive: 'true',
      ageGroup: '6 months'
    });
    
    // response.data contains array of baby foods
    console.log(response.data);
  } catch (error) {
    console.error('Error loading baby foods:', error);
  }
}
```

#### Display in React Component
```jsx
import React, { useState, useEffect } from 'react';
import BabyFoodAPI from './api/BabyFoodAPI';

function BabyFoodsList() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const api = new BabyFoodAPI();

  useEffect(() => {
    loadFoods();
  }, []);

  async function loadFoods() {
    try {
      const response = await api.getBabyFoods({
        isActive: 'true'
      });
      setFoods(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="baby-foods-grid">
      {foods.map((food) => (
        <div key={food._id} className="food-card">
          {food.image && <img src={`http://localhost:5000${food.image}`} alt={food.title} />}
          <h3>{food.title}</h3>
          <p>{food.description}</p>
          <p>Age Group: {food.ageGroup}</p>
          <p>Prep Time: {food.prepTime} minutes</p>
          <ul>
            {food.ingredients.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
          <p>{food.instructions}</p>
        </div>
      ))}
    </div>
  );
}

export default BabyFoodsList;
```

### 3. Display Blog Posts on Frontend

#### Get Published Blogs
```javascript
async function loadBlogs() {
  try {
    const response = await api.getBlogs({
      isPublished: 'true',
      category: 'recipes'
    });
    
    console.log(response.data);
  } catch (error) {
    console.error('Error loading blogs:', error);
  }
}
```

#### Display in React Component
```jsx
import React, { useState, useEffect } from 'react';
import BabyFoodAPI from './api/BabyFoodAPI';

function BlogsList() {
  const [blogs, setBlogs] = useState([]);
  const api = new BabyFoodAPI();

  useEffect(() => {
    loadBlogs();
  }, []);

  async function loadBlogs() {
    try {
      const response = await api.getBlogs({
        isPublished: 'true'
      });
      setBlogs(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="blogs-container">
      {blogs.map((blog) => (
        <article key={blog._id} className="blog-card">
          {blog.featuredImage && (
            <img src={`http://localhost:5000${blog.featuredImage}`} alt={blog.title} />
          )}
          <h2>{blog.title}</h2>
          <div className="blog-meta">
            <span>{blog.author.name}</span>
            <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
            <span>{blog.views} views</span>
          </div>
          {blog.excerpt && <p>{blog.excerpt}</p>}
          <div className="blog-tags">
            {blog.tags.map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
          <a href={`/blog/${blog._id}`}>Read More →</a>
        </article>
      ))}
    </div>
  );
}

export default BlogsList;
```

### 4. Get Specific Blog Post

```jsx
import React, { useState, useEffect } from 'react';
import BabyFoodAPI from './api/BabyFoodAPI';
import { useParams } from 'react-router-dom';

function BlogDetail() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = new BabyFoodAPI();

  useEffect(() => {
    loadBlog();
  }, [id]);

  async function loadBlog() {
    try {
      const response = await api.getBlog(id);
      setBlog(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!blog) return <div>Blog not found</div>;

  return (
    <article className="blog-detail">
      {blog.featuredImage && (
        <img src={`http://localhost:5000${blog.featuredImage}`} alt={blog.title} />
      )}
      <h1>{blog.title}</h1>
      <div className="blog-meta">
        <span>By {blog.author.name}</span>
        <span>{new Date(blog.publishedDate || blog.createdAt).toLocaleDateString()}</span>
      </div>
      {blog.category && <span className="category">{blog.category}</span>}
      <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.content }} />
      <div className="blog-tags">
        {blog.tags.map((tag) => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
    </article>
  );
}

export default BlogDetail;
```

### 5. Display Categories

```jsx
import React, { useState, useEffect } from 'react';
import BabyFoodAPI from './api/BabyFoodAPI';

function CategoriesList() {
  const [categories, setCategories] = useState([]);
  const api = new BabyFoodAPI();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const response = await api.getCategories({
        isActive: 'true'
      });
      setCategories(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="categories-grid">
      {categories.map((category) => (
        <div key={category._id} className="category-card">
          {category.image && (
            <img src={`http://localhost:5000${category.image}`} alt={category.name} />
          )}
          <h3>{category.name}</h3>
          <p>{category.description}</p>
          <span className="age-group">Age: {category.ageGroup}</span>
        </div>
      ))}
    </div>
  );
}

export default CategoriesList;
```

### 6. Filter Baby Foods by Age Group

```jsx
function BabyFoodsFiltered({ selectedAgeGroup }) {
  const [foods, setFoods] = useState([]);
  const api = new BabyFoodAPI();

  useEffect(() => {
    loadFoodsByAge();
  }, [selectedAgeGroup]);

  async function loadFoodsByAge() {
    try {
      const response = await api.getBabyFoods({
        ageGroup: selectedAgeGroup,
        isActive: 'true'
      });
      setFoods(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="foods-grid">
      {foods.map((food) => (
        <FoodCard key={food._id} food={food} />
      ))}
    </div>
  );
}
```

### 7. CORS Configuration

For production, update your backend `.env`:

```env
CORS_ORIGIN=https://yourdomain.com
```

And update server.js to use it:

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### 8. Environment Variables in React

Create `.env` in your React app:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Use it:

```javascript
const api = new BabyFoodAPI(process.env.REACT_APP_API_URL);
```

### 9. Error Handling

```javascript
async function loadData() {
  try {
    const response = await api.getBabyFoods();
    return response.data;
  } catch (error) {
    if (error.message === 'HTTP 401') {
      // Handle unauthorized - redirect to login
    } else if (error.message === 'HTTP 403') {
      // Handle forbidden - show permission error
    } else {
      // Handle other errors
      console.error('Error:', error.message);
    }
  }
}
```

### 10. Update Image Base URLs

In your CSS, update image paths:

```css
.food-card img {
  background-image: url('http://localhost:5000/uploads/...');
}
```

Or in React:

```jsx
<img src={`http://localhost:5000${food.image}`} />
```

## Testing API Endpoints

Use Postman or similar tools:

```
GET http://localhost:5000/api/baby-foods
GET http://localhost:5000/api/blogs?isPublished=true
GET http://localhost:5000/api/categories
```

## Common Issues

1. **CORS Error**: Make sure backend is running and CORS is enabled
2. **404 Images**: Check image paths match: `/uploads/filename`
3. **Empty Results**: Verify data was seeded via `npm run seed`
4. **Auth Errors**: Include token in Authorization header
