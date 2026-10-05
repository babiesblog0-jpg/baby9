// API Configuration - auto-detect base URL
const API_BASE_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (!authToken) {
    showLoginPage();
  } else {
    showDashboard();
  }
});

// ==================== Authentication ====================

function showLoginPage() {
  document.getElementById('loginPage').style.display = 'block';
  document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'block';
  loadDashboard();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showAlert('Login successful!', 'success');
      setTimeout(() => showDashboard(), 1000);
    } else {
      showAlert(data.message || 'Login failed', 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }

  document.getElementById('loginForm').reset();
}

function handleLogout() {
  authToken = null;
  currentUser = {};
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  document.getElementById('loginForm').reset();
  showLoginPage();
  showAlert('Logged out successfully', 'success');
}

// ==================== Navigation ====================

function switchTab(tabName) {
  // Hide all content sections
  document.querySelectorAll('.main-content').forEach((el) => el.classList.remove('active'));

  // Remove active class from all nav links
  document.querySelectorAll('.sidebar a').forEach((el) => el.classList.remove('active'));

  // Show selected content
  document.getElementById(tabName + 'Content').classList.add('active');

  // Add active class to clicked nav link
  event.target.classList.add('active');

  // Load data based on tab
  if (tabName === 'babyFood') loadBabyFoods();
  else if (tabName === 'blog') loadBlogs();
  else if (tabName === 'parentingTip') loadParentingTips();
  else if (tabName === 'parentingGallery') loadGalleryItems();
  else if (tabName === 'category') loadCategories();
  else if (tabName === 'pantryIngredient') loadPantryIngredients();
  else if (tabName === 'featuredDelight') loadFeaturedDelights();
  else if (tabName === 'fingerFood') loadFingerFoods();
  else if (tabName === 'product') {
    loadProducts();
    loadShopDisclaimer();
  }
  else if (tabName === 'dashboard') loadDashboard();
}

// ==================== Dashboard ====================

async function loadDashboard() {
  try {
    const foodRes = await fetch(`${API_BASE_URL}/baby-foods`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const blogsRes = await fetch(`${API_BASE_URL}/blogs`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const categoriesRes = await fetch(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const tipsRes = await fetch(`${API_BASE_URL}/parenting-tips`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const foods = await foodRes.json();
    const blogs = await blogsRes.json();
    const categories = await categoriesRes.json();
    const tips = await tipsRes.json();

    const statsHtml = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold;">${foods.count || 0}</div>
          <div>Baby Foods</div>
        </div>
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold;">${blogs.count || 0}</div>
          <div>Blog Posts</div>
        </div>
        <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold;">${tips.count || 0}</div>
          <div>Parenting Tips</div>
        </div>
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold;">${categories.count || 0}</div>
          <div>Categories</div>
        </div>
      </div>
    `;

    document.getElementById('dashboardStats').innerHTML = statsHtml;
  } catch (error) {
    showAlert('Error loading dashboard: ' + error.message, 'error');
  }
}

// ==================== Baby Foods ====================

async function loadBabyFoods() {
  try {
    document.getElementById('babyFoodList').innerHTML = '<div class="spinner show"></div>';

    const response = await fetch(`${API_BASE_URL}/baby-foods`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderBabyFoodsList(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderBabyFoodsList(foods) {
  if (foods.length === 0) {
    document.getElementById('babyFoodList').innerHTML =
      '<div class="empty-state"><p>No baby foods yet. Create one!</p></div>';
    return;
  }

  const html = foods
    .map(
      (food) => `
    <tr>
      <td>${food.title}</td>
      <td>${food.ageGroup}</td>
      <td>${food.prepTime} min</td>
      <td><span class="badge ${food.isActive ? 'badge-success' : 'badge-danger'}">${food.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editBabyFood('${food._id || food.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBabyFood('${food._id || food.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  document.getElementById('babyFoodList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Age Group</th>
            <th>Prep Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSaveBabyFood(e) {
  e.preventDefault();

  const id = document.getElementById('babyFoodId').value;
  const isEditing = !!id;

  const formData = new FormData();
  formData.append('title', document.getElementById('babyFoodTitle').value);
  formData.append('description', document.getElementById('babyFoodDescription').value);
  formData.append('ingredients', document.getElementById('babyFoodIngredients').value);
  formData.append('instructions', document.getElementById('babyFoodInstructions').value);
  formData.append('tips', document.getElementById('babyFoodTips').value);
  formData.append('ageGroup', document.getElementById('babyFoodAgeGroup').value);
  formData.append('category', document.getElementById('babyFoodCategory').value);
  formData.append('prepTime', document.getElementById('babyFoodPrepTime').value);
  formData.append('servings', document.getElementById('babyFoodServings').value);

  const imageFile = document.getElementById('babyFoodImage').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/baby-foods/${id}` : `${API_BASE_URL}/baby-foods`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Baby food ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
      resetBabyFoodForm();
      loadBabyFoods();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editBabyFood(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/baby-foods/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const food = data.data;
      
      document.getElementById('babyFoodId').value = food._id || food.id;
      document.getElementById('babyFoodTitle').value = food.title;
      document.getElementById('babyFoodDescription').value = food.description;
      document.getElementById('babyFoodIngredients').value = Array.isArray(food.ingredients) ? food.ingredients.join(', ') : food.ingredients;
      document.getElementById('babyFoodInstructions').value = food.instructions;
      document.getElementById('babyFoodTips').value = food.tips || '';
      document.getElementById('babyFoodAgeGroup').value = food.ageGroup;
      
      // Need to wait for categories to load if they haven't
      document.getElementById('babyFoodCategory').value = food.categoryId || food.category?.id || food.category?._id;
      
      document.getElementById('babyFoodPrepTime').value = food.prepTime;
      document.getElementById('babyFoodServings').value = food.servings;

      if (food.image) {
        const preview = document.getElementById('babyFoodPreview');
        preview.src = food.image;
        preview.style.display = 'block';
      }

      document.getElementById('babyFoodFormTitle').textContent = 'Edit Baby Food';
      document.getElementById('babyFoodSubmitBtn').textContent = 'Update Baby Food';
      document.getElementById('babyFoodCancelBtn').style.display = 'block';
      
      // Scroll to form
      document.getElementById('babyFoodForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetBabyFoodForm() {
  document.getElementById('babyFoodForm').reset();
  document.getElementById('babyFoodId').value = '';
  document.getElementById('babyFoodFormTitle').textContent = 'Add New Baby Food';
  document.getElementById('babyFoodSubmitBtn').textContent = 'Add Baby Food';
  document.getElementById('babyFoodCancelBtn').style.display = 'none';
  const preview = document.getElementById('babyFoodPreview');
  if (preview) preview.style.display = 'none';
}

async function deleteBabyFood(id) {
  if (!confirm('Are you sure you want to delete this baby food?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/baby-foods/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Baby food deleted successfully!', 'success');
      loadBabyFoods();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// ==================== Blogs ====================

async function loadBlogs() {
  try {
    document.getElementById('blogList').innerHTML = '<div class="spinner show"></div>';

    const response = await fetch(`${API_BASE_URL}/blogs`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderBlogsList(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderBlogsList(blogs) {
  if (blogs.length === 0) {
    document.getElementById('blogList').innerHTML = '<div class="empty-state"><p>No blogs yet. Create one!</p></div>';
    return;
  }

  const html = blogs
    .map(
      (blog) => `
    <tr>
      <td>${blog.title}</td>
      <td>${blog.category}</td>
      <td><span class="badge ${blog.isPublished ? 'badge-success' : 'badge-danger'}">${blog.isPublished ? 'Published' : 'Draft'}</span></td>
      <td>${new Date(blog.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editBlog('${blog._id || blog.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBlog('${blog._id || blog.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  document.getElementById('blogList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSaveBlog(e) {
  e.preventDefault();

  const id = document.getElementById('blogId').value;
  const isEditing = !!id;

  const formData = new FormData();
  formData.append('title', document.getElementById('blogTitle').value);
  formData.append('content', document.getElementById('contentEditor').innerHTML);
  formData.append('excerpt', document.getElementById('blogExcerpt').value);
  formData.append('category', document.getElementById('blogCategory').value);
  formData.append('tags', document.getElementById('blogTags').value);
  formData.append('isPublished', document.getElementById('blogPublish').checked);

  const imageFile = document.getElementById('blogImage').files[0];
  if (imageFile) {
    formData.append('featuredImage', imageFile);
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/blogs/${id}` : `${API_BASE_URL}/blogs`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Blog post ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
      resetBlogForm();
      loadBlogs();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editBlog(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const blog = data.data;
      
      document.getElementById('blogId').value = blog._id || blog.id;
      document.getElementById('blogTitle').value = blog.title;
      document.getElementById('contentEditor').innerHTML = blog.content;
      document.getElementById('blogExcerpt').value = blog.excerpt || '';
      document.getElementById('blogCategory').value = blog.category;
      document.getElementById('blogTags').value = Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags;
      document.getElementById('blogPublish').checked = blog.isPublished;

      if (blog.featuredImage) {
        const preview = document.getElementById('blogPreview');
        preview.src = blog.featuredImage;
        preview.style.display = 'block';
      }

      document.getElementById('blogFormTitle').textContent = 'Edit Blog Post';
      document.getElementById('blogSubmitBtn').textContent = 'Update Blog Post';
      document.getElementById('blogCancelBtn').style.display = 'block';
      
      document.getElementById('blogForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetBlogForm() {
  document.getElementById('blogForm').reset();
  document.getElementById('blogId').value = '';
  document.getElementById('contentEditor').innerHTML = '';
  document.getElementById('blogFormTitle').textContent = 'Add New Blog Post';
  document.getElementById('blogSubmitBtn').textContent = 'Add Blog Post';
  document.getElementById('blogCancelBtn').style.display = 'none';
  const preview = document.getElementById('blogPreview');
  if (preview) preview.style.display = 'none';
}

async function deleteBlog(id) {
  if (!confirm('Are you sure you want to delete this blog?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Blog deleted successfully!', 'success');
      loadBlogs();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// ==================== Categories ====================

async function loadCategories() {
  try {
    document.getElementById('categoryList').innerHTML = '<div class="spinner show"></div>';

    const response = await fetch(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderCategoriesList(data.data);
      populateCategorySelects(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderCategoriesList(categories) {
  if (categories.length === 0) {
    document.getElementById('categoryList').innerHTML =
      '<div class="empty-state"><p>No categories yet. Create one!</p></div>';
    return;
  }

  const html = categories
    .map(
      (cat) => `
    <tr>
      <td>${cat.name}</td>
      <td><span class="badge ${cat.isActive ? 'badge-success' : 'badge-danger'}">${cat.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editCategory('${cat._id || cat.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory('${cat._id || cat.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  document.getElementById('categoryList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

function populateCategorySelects(categories) {
  const categorySelects = document.querySelectorAll('#babyFoodCategory');
  categorySelects.forEach((select) => {
    select.innerHTML = '<option value="">Select Category</option>';
    categories.forEach((cat) => {
      select.innerHTML += `<option value="${cat._id || cat.id}">${cat.name}</option>`;
    });
  });
}

async function handleSaveCategory(e) {
  e.preventDefault();

  const id = document.getElementById('categoryId').value;
  const isEditing = !!id;

  const formData = new FormData();
  formData.append('name', document.getElementById('categoryName').value);

  const imageFile = document.getElementById('categoryImage').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/categories/${id}` : `${API_BASE_URL}/categories`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Category ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
      resetCategoryForm();
      loadCategories();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editCategory(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const cat = data.data;
      
      document.getElementById('categoryId').value = cat._id || cat.id;
      document.getElementById('categoryName').value = cat.name;

      if (cat.image) {
        const preview = document.getElementById('categoryPreview');
        preview.src = cat.image;
        preview.style.display = 'block';
      }

      document.getElementById('categoryFormTitle').textContent = 'Edit Category';
      document.getElementById('categorySubmitBtn').textContent = 'Update Category';
      document.getElementById('categoryCancelBtn').style.display = 'block';
      
      document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetCategoryForm() {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryFormTitle').textContent = 'Add New Category';
  document.getElementById('categorySubmitBtn').textContent = 'Add Category';
  document.getElementById('categoryCancelBtn').style.display = 'none';
  const preview = document.getElementById('categoryPreview');
  if (preview) preview.style.display = 'none';
}

async function deleteCategory(id) {
  if (!confirm('Are you sure you want to delete this category?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Category deleted successfully!', 'success');
      loadCategories();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// ==================== Pantry Ingredients ====================

function togglePantryIconSource() {
  const useImage = document.getElementById('pantryIconSourceImage').checked;
  document.getElementById('pantryIconEmojiGroup').style.display = useImage ? 'none' : 'block';
  document.getElementById('pantryIconImageGroup').style.display = useImage ? 'block' : 'none';
}

// Headings come straight from the Categories section — add a new one there
// first if it's not in this list yet.
async function loadPantryCategoryGroups(selected) {
  try {
    const response = await fetch(`${API_BASE_URL}/categories?isActive=true`);
    const data = await response.json();

    const select = document.getElementById('pantryIngredientCategoryGroup');
    select.innerHTML = '<option value="">Select a heading</option>';
    if (data.success && data.data.length > 0) {
      data.data.forEach((cat) => {
        select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
    } else {
      select.innerHTML += '<option value="" disabled>No categories yet — add one in 📂 Categories</option>';
    }
    if (selected) select.value = selected;
  } catch (error) {
    showAlert('Error loading category headings: ' + error.message, 'error');
  }
}

async function loadPantryIngredients() {
  try {
    document.getElementById('pantryIngredientList').innerHTML = '<div class="spinner show"></div>';
    loadPantryCategoryGroups();

    const response = await fetch(`${API_BASE_URL}/pantry-ingredients`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderPantryIngredientsList(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderPantryIngredientsList(items) {
  if (items.length === 0) {
    document.getElementById('pantryIngredientList').innerHTML =
      '<div class="empty-state"><p>No pantry ingredients yet. Add one!</p></div>';
    return;
  }

  const html = items
    .map((item) => {
      const iconCell = item.image
        ? `<img src="${item.image}" alt="${item.name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px;" />`
        : `<span style="font-size: 20px;">${item.icon || ''}</span>`;
      return `
    <tr>
      <td>${iconCell}</td>
      <td>${item.name}</td>
      <td>${item.categoryGroup}</td>
      <td>${item.minAgeMonths}m</td>
      <td><span class="badge ${item.isActive ? 'badge-success' : 'badge-danger'}">${item.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editPantryIngredient('${item._id || item.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePantryIngredient('${item._id || item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `;
    })
    .join('');

  document.getElementById('pantryIngredientList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Icon</th>
            <th>Name</th>
            <th>Heading</th>
            <th>Min Age</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSavePantryIngredient(e) {
  e.preventDefault();

  const id = document.getElementById('pantryIngredientId').value;
  const isEditing = !!id;

  const categoryGroup = document.getElementById('pantryIngredientCategoryGroup').value;

  if (!categoryGroup) {
    showAlert('Please select a heading', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('name', document.getElementById('pantryIngredientName').value);
  formData.append('categoryGroup', categoryGroup);
  formData.append('minAgeMonths', document.getElementById('pantryIngredientMinAge').value);
  formData.append('isActive', document.getElementById('pantryIngredientActive').checked);

  const useImage = document.getElementById('pantryIconSourceImage').checked;
  const imageFile = document.getElementById('pantryIngredientImage').files[0];

  if (useImage && imageFile) {
    formData.append('image', imageFile);
  } else {
    formData.append('icon', document.getElementById('pantryIngredientIcon').value || '🍽️');
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/pantry-ingredients/${id}` : `${API_BASE_URL}/pantry-ingredients`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Pantry ingredient ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
      resetPantryIngredientForm();
      loadPantryIngredients();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editPantryIngredient(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/pantry-ingredients/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const item = data.data;

      document.getElementById('pantryIngredientId').value = item._id || item.id;
      document.getElementById('pantryIngredientName').value = item.name;
      document.getElementById('pantryIngredientMinAge').value = item.minAgeMonths;
      document.getElementById('pantryIngredientActive').checked = item.isActive;

      await loadPantryCategoryGroups(item.categoryGroup);

      if (item.image) {
        document.getElementById('pantryIconSourceImage').checked = true;
        togglePantryIconSource();
        const preview = document.getElementById('pantryIngredientPreview');
        preview.src = item.image;
        preview.style.display = 'block';
      } else {
        document.getElementById('pantryIconSourceEmoji').checked = true;
        togglePantryIconSource();
        document.getElementById('pantryIngredientIcon').value = item.icon || '';
      }

      document.getElementById('pantryIngredientFormTitle').textContent = 'Edit Pantry Ingredient';
      document.getElementById('pantryIngredientSubmitBtn').textContent = 'Update Ingredient';
      document.getElementById('pantryIngredientCancelBtn').style.display = 'block';

      document.getElementById('pantryIngredientForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetPantryIngredientForm() {
  document.getElementById('pantryIngredientForm').reset();
  document.getElementById('pantryIngredientId').value = '';
  document.getElementById('pantryIngredientActive').checked = true;
  document.getElementById('pantryIconSourceEmoji').checked = true;
  togglePantryIconSource();
  document.getElementById('pantryIngredientFormTitle').textContent = 'Add New Pantry Ingredient';
  document.getElementById('pantryIngredientSubmitBtn').textContent = 'Add Ingredient';
  document.getElementById('pantryIngredientCancelBtn').style.display = 'none';
  const preview = document.getElementById('pantryIngredientPreview');
  if (preview) preview.style.display = 'none';
  loadPantryCategoryGroups();
}

async function deletePantryIngredient(id) {
  if (!confirm('Are you sure you want to delete this pantry ingredient?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/pantry-ingredients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Pantry ingredient deleted successfully!', 'success');
      loadPantryIngredients();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// ==================== Featured Delights ====================

function toggleFeaturedIconSource() {
  const useImage = document.getElementById('featuredIconSourceImage').checked;
  document.getElementById('featuredIconEmojiGroup').style.display = useImage ? 'none' : 'block';
  document.getElementById('featuredIconImageGroup').style.display = useImage ? 'block' : 'none';
}

async function loadFeaturedDelights() {
  try {
    document.getElementById('featuredDelightList').innerHTML = '<div class="spinner show"></div>';

    const response = await fetch(`${API_BASE_URL}/featured-delights`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderFeaturedDelightsList(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderFeaturedDelightsList(items) {
  if (items.length === 0) {
    document.getElementById('featuredDelightList').innerHTML =
      '<div class="empty-state"><p>No featured delights yet. Add one!</p></div>';
    return;
  }

  const html = items
    .map((item) => {
      const iconCell = item.image
        ? `<img src="${item.image}" alt="${item.title}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px;" />`
        : `<span style="font-size: 26px;">${item.icon || ''}</span>`;
      return `
    <tr>
      <td>${iconCell}</td>
      <td>${item.title}</td>
      <td>${item.ageLabel || '—'}</td>
      <td>${item.sortOrder}</td>
      <td><span class="badge ${item.isActive ? 'badge-success' : 'badge-danger'}">${item.isActive ? 'Active' : 'Hidden'}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editFeaturedDelight('${item._id || item.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFeaturedDelight('${item._id || item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `;
    })
    .join('');

  document.getElementById('featuredDelightList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Icon</th>
            <th>Title</th>
            <th>Age Label</th>
            <th>Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSaveFeaturedDelight(e) {
  e.preventDefault();

  const id = document.getElementById('featuredDelightId').value;
  const isEditing = !!id;

  const formData = new FormData();
  formData.append('title', document.getElementById('featuredDelightTitle').value);
  formData.append('description', document.getElementById('featuredDelightDescription').value);
  formData.append('ageLabel', document.getElementById('featuredDelightAgeLabel').value || '');
  formData.append('sortOrder', document.getElementById('featuredDelightSortOrder').value || 0);
  formData.append('isActive', document.getElementById('featuredDelightActive').checked);

  const useImage = document.getElementById('featuredIconSourceImage').checked;
  const imageFile = document.getElementById('featuredDelightImage').files[0];

  if (useImage && imageFile) {
    formData.append('image', imageFile);
  } else {
    formData.append('icon', document.getElementById('featuredDelightIcon').value || '🍽️');
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/featured-delights/${id}` : `${API_BASE_URL}/featured-delights`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Featured delight ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
      resetFeaturedDelightForm();
      loadFeaturedDelights();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editFeaturedDelight(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/featured-delights/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const item = data.data;

      document.getElementById('featuredDelightId').value = item._id || item.id;
      document.getElementById('featuredDelightTitle').value = item.title;
      document.getElementById('featuredDelightDescription').value = item.description;
      document.getElementById('featuredDelightAgeLabel').value = item.ageLabel || '';
      document.getElementById('featuredDelightSortOrder').value = item.sortOrder;
      document.getElementById('featuredDelightActive').checked = item.isActive;

      if (item.image) {
        document.getElementById('featuredIconSourceImage').checked = true;
        toggleFeaturedIconSource();
        const preview = document.getElementById('featuredDelightPreview');
        preview.src = item.image;
        preview.style.display = 'block';
      } else {
        document.getElementById('featuredIconSourceEmoji').checked = true;
        toggleFeaturedIconSource();
        document.getElementById('featuredDelightIcon').value = item.icon || '';
      }

      document.getElementById('featuredDelightFormTitle').textContent = 'Edit Featured Delight';
      document.getElementById('featuredDelightSubmitBtn').textContent = 'Update Featured Delight';
      document.getElementById('featuredDelightCancelBtn').style.display = 'block';

      document.getElementById('featuredDelightForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetFeaturedDelightForm() {
  document.getElementById('featuredDelightForm').reset();
  document.getElementById('featuredDelightId').value = '';
  document.getElementById('featuredDelightActive').checked = true;
  document.getElementById('featuredIconSourceEmoji').checked = true;
  toggleFeaturedIconSource();
  document.getElementById('featuredDelightFormTitle').textContent = 'Add New Featured Delight';
  document.getElementById('featuredDelightSubmitBtn').textContent = 'Add Featured Delight';
  document.getElementById('featuredDelightCancelBtn').style.display = 'none';
  const preview = document.getElementById('featuredDelightPreview');
  if (preview) preview.style.display = 'none';
}

async function deleteFeaturedDelight(id) {
  if (!confirm('Are you sure you want to delete this featured delight?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/featured-delights/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Featured delight deleted successfully!', 'success');
      loadFeaturedDelights();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// ==================== Finger Foods ====================

function toggleFingerFoodIconSource() {
  const useImage = document.getElementById('fingerFoodIconSourceImage').checked;
  document.getElementById('fingerFoodIconEmojiGroup').style.display = useImage ? 'none' : 'block';
  document.getElementById('fingerFoodIconImageGroup').style.display = useImage ? 'block' : 'none';
}

async function loadFingerFoods() {
  try {
    document.getElementById('fingerFoodList').innerHTML = '<div class="spinner show"></div>';

    const response = await fetch(`${API_BASE_URL}/finger-foods`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderFingerFoodsList(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderFingerFoodsList(items) {
  if (items.length === 0) {
    document.getElementById('fingerFoodList').innerHTML =
      '<div class="empty-state"><p>No finger foods yet. Add one!</p></div>';
    return;
  }

  const html = items
    .map((item) => {
      const iconCell = item.image
        ? `<img src="${item.image}" alt="${item.name}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 8px;" />`
        : `<span style="font-size: 22px;">${item.icon || ''}</span>`;
      return `
    <tr>
      <td>${iconCell}</td>
      <td>${item.name}</td>
      <td>${item.minAgeMonths}m+</td>
      <td><span class="badge ${item.isActive ? 'badge-success' : 'badge-danger'}">${item.isActive ? 'Active' : 'Hidden'}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editFingerFood('${item._id || item.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFingerFood('${item._id || item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `;
    })
    .join('');

  document.getElementById('fingerFoodList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Icon</th>
            <th>Name</th>
            <th>Safe From</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSaveFingerFood(e) {
  e.preventDefault();

  const id = document.getElementById('fingerFoodId').value;
  const isEditing = !!id;

  const formData = new FormData();
  formData.append('name', document.getElementById('fingerFoodName').value);
  formData.append('description', document.getElementById('fingerFoodDescription').value);
  formData.append('minAgeMonths', document.getElementById('fingerFoodMinAge').value);
  formData.append('isActive', document.getElementById('fingerFoodActive').checked);

  const useImage = document.getElementById('fingerFoodIconSourceImage').checked;
  const imageFile = document.getElementById('fingerFoodImage').files[0];

  if (useImage && imageFile) {
    formData.append('image', imageFile);
  } else {
    formData.append('icon', document.getElementById('fingerFoodIcon').value || '🍽️');
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/finger-foods/${id}` : `${API_BASE_URL}/finger-foods`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Finger food ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
      resetFingerFoodForm();
      loadFingerFoods();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editFingerFood(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/finger-foods/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const item = data.data;

      document.getElementById('fingerFoodId').value = item._id || item.id;
      document.getElementById('fingerFoodName').value = item.name;
      document.getElementById('fingerFoodDescription').value = item.description;
      document.getElementById('fingerFoodMinAge').value = item.minAgeMonths;
      document.getElementById('fingerFoodActive').checked = item.isActive;

      if (item.image) {
        document.getElementById('fingerFoodIconSourceImage').checked = true;
        toggleFingerFoodIconSource();
        const preview = document.getElementById('fingerFoodPreview');
        preview.src = item.image;
        preview.style.display = 'block';
      } else {
        document.getElementById('fingerFoodIconSourceEmoji').checked = true;
        toggleFingerFoodIconSource();
        document.getElementById('fingerFoodIcon').value = item.icon || '';
      }

      document.getElementById('fingerFoodFormTitle').textContent = 'Edit Finger Food';
      document.getElementById('fingerFoodSubmitBtn').textContent = 'Update Finger Food';
      document.getElementById('fingerFoodCancelBtn').style.display = 'block';

      document.getElementById('fingerFoodForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetFingerFoodForm() {
  document.getElementById('fingerFoodForm').reset();
  document.getElementById('fingerFoodId').value = '';
  document.getElementById('fingerFoodActive').checked = true;
  document.getElementById('fingerFoodIconSourceEmoji').checked = true;
  toggleFingerFoodIconSource();
  document.getElementById('fingerFoodFormTitle').textContent = 'Add New Finger Food';
  document.getElementById('fingerFoodSubmitBtn').textContent = 'Add Finger Food';
  document.getElementById('fingerFoodCancelBtn').style.display = 'none';
  const preview = document.getElementById('fingerFoodPreview');
  if (preview) preview.style.display = 'none';
}

async function deleteFingerFood(id) {
  if (!confirm('Are you sure you want to delete this finger food?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/finger-foods/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Finger food deleted successfully!', 'success');
      loadFingerFoods();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// ==================== Utility Functions ====================

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} show`;
  alertDiv.textContent = message;
  document.body.insertBefore(alertDiv, document.body.firstChild);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

// Image preview
function previewImage(inputId, previewId) {
  const file = document.getElementById(inputId).files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById(previewId);
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }
}

// Rich text editor commands
function execCommand(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('contentEditor').focus();
}

// Rich text editor commands for Parenting Tips
function execCommandTip(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('tipContentEditor').focus();
}

// ==================== Parenting Tips ====================

async function loadParentingTips() {
  try {
    document.getElementById('parentingTipList').innerHTML = '<div class="spinner show"></div>';

    const response = await fetch(`${API_BASE_URL}/parenting-tips`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderParentingTipsList(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderParentingTipsList(tips) {
  if (tips.length === 0) {
    document.getElementById('parentingTipList').innerHTML = '<div class="empty-state"><p>No parenting tips yet. Create one!</p></div>';
    return;
  }

  const html = tips
    .map(
      (tip) => `
    <tr>
      <td>${tip.title}</td>
      <td>${tip.category}</td>
      <td><span class="badge ${tip.isPublished ? 'badge-success' : 'badge-danger'}">${tip.isPublished ? 'Published' : 'Draft'}</span></td>
      <td>${new Date(tip.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editParentingTip('${tip._id || tip.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteParentingTip('${tip._id || tip.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  document.getElementById('parentingTipList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSaveParentingTip(e) {
  e.preventDefault();

  const id = document.getElementById('parentingTipId').value;
  const isEditing = !!id;

  const formData = new FormData();
  formData.append('title', document.getElementById('parentingTipTitle').value);
  formData.append('content', document.getElementById('tipContentEditor').innerHTML);
  formData.append('excerpt', document.getElementById('parentingTipExcerpt').value);
  formData.append('category', document.getElementById('parentingTipCategory').value);
  formData.append('tags', document.getElementById('parentingTipTags').value);
  formData.append('isPublished', document.getElementById('parentingTipPublish').checked);

  const imageFile = document.getElementById('parentingTipImage').files[0];
  if (imageFile) {
    formData.append('featuredImage', imageFile);
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/parenting-tips/${id}` : `${API_BASE_URL}/parenting-tips`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Parenting tip ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
      resetParentingTipForm();
      loadParentingTips();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editParentingTip(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/parenting-tips/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const tip = data.data;

      document.getElementById('parentingTipId').value = tip._id || tip.id;
      document.getElementById('parentingTipTitle').value = tip.title;
      document.getElementById('tipContentEditor').innerHTML = tip.content;
      document.getElementById('parentingTipExcerpt').value = tip.excerpt || '';
      document.getElementById('parentingTipCategory').value = tip.category;
      document.getElementById('parentingTipTags').value = Array.isArray(tip.tags) ? tip.tags.join(', ') : tip.tags;
      document.getElementById('parentingTipPublish').checked = tip.isPublished;

      if (tip.featuredImage) {
        const preview = document.getElementById('parentingTipPreview');
        preview.src = tip.featuredImage;
        preview.style.display = 'block';
      }

      document.getElementById('parentingTipFormTitle').textContent = 'Edit Parenting Tip';
      document.getElementById('parentingTipSubmitBtn').textContent = 'Update Parenting Tip';
      document.getElementById('parentingTipCancelBtn').style.display = 'block';

      document.getElementById('parentingTipForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetParentingTipForm() {
  document.getElementById('parentingTipForm').reset();
  document.getElementById('parentingTipId').value = '';
  document.getElementById('tipContentEditor').innerHTML = '';
  document.getElementById('parentingTipFormTitle').textContent = 'Add New Parenting Tip';
  document.getElementById('parentingTipSubmitBtn').textContent = 'Add Parenting Tip';
  document.getElementById('parentingTipCancelBtn').style.display = 'none';
  const preview = document.getElementById('parentingTipPreview');
  if (preview) preview.style.display = 'none';
}

async function deleteParentingTip(id) {
  if (!confirm('Are you sure you want to delete this parenting tip?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/parenting-tips/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Parenting tip deleted successfully!', 'success');
      loadParentingTips();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// Update user info
function updateUserInfo() {
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  if (userNameEl) userNameEl.textContent = currentUser.name || 'User';
  if (userEmailEl) userEmailEl.textContent = currentUser.email || '';
}

// ==================== Parenting Gallery ====================

async function loadGalleryItems() {
  try {
    document.getElementById('galleryList').innerHTML = '<div class="spinner show"></div>';

    const response = await fetch(`${API_BASE_URL}/parenting-gallery`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      renderGalleryList(data.data);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderGalleryList(items) {
  if (items.length === 0) {
    document.getElementById('galleryList').innerHTML = '<div class="empty-state"><p>No gallery photos yet. Add one!</p></div>';
    return;
  }

  const html = items
    .map(
      (item) => `
    <tr>
      <td><img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" /></td>
      <td>${item.name}</td>
      <td>${item.sortOrder}</td>
      <td><span class="badge ${item.isActive ? 'badge-success' : 'badge-danger'}">${item.isActive ? 'Active' : 'Hidden'}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editGalleryItem('${item._id || item.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteGalleryItem('${item._id || item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  document.getElementById('galleryList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSaveGalleryItem(e) {
  e.preventDefault();

  const id = document.getElementById('galleryItemId').value;
  const isEditing = !!id;

  const formData = new FormData();
  formData.append('name', document.getElementById('galleryName').value);
  formData.append('sortOrder', document.getElementById('gallerySortOrder').value);
  formData.append('isActive', document.getElementById('galleryActive').checked);

  const imageFile = document.getElementById('galleryImage').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  } else if (!isEditing) {
    showAlert('Please upload a photo', 'error');
    return;
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/parenting-gallery/${id}` : `${API_BASE_URL}/parenting-gallery`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Photo ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
      resetGalleryForm();
      loadGalleryItems();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editGalleryItem(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/parenting-gallery/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const item = data.data;

      document.getElementById('galleryItemId').value = item._id || item.id;
      document.getElementById('galleryName').value = item.name;
      document.getElementById('gallerySortOrder').value = item.sortOrder || 0;
      document.getElementById('galleryActive').checked = item.isActive;

      if (item.image) {
        const preview = document.getElementById('galleryPreview');
        preview.src = item.image;
        preview.style.display = 'block';
      }

      document.getElementById('galleryFormTitle').textContent = 'Edit Gallery Photo';
      document.getElementById('gallerySubmitBtn').textContent = 'Update Photo';
      document.getElementById('galleryCancelBtn').style.display = 'block';

      document.getElementById('galleryForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetGalleryForm() {
  document.getElementById('galleryForm').reset();
  document.getElementById('galleryItemId').value = '';
  document.getElementById('galleryActive').checked = true;
  document.getElementById('galleryFormTitle').textContent = 'Add Gallery Photo';
  document.getElementById('gallerySubmitBtn').textContent = 'Add Photo';
  document.getElementById('galleryCancelBtn').style.display = 'none';
  const preview = document.getElementById('galleryPreview');
  if (preview) preview.style.display = 'none';
}

async function deleteGalleryItem(id) {
  if (!confirm('Are you sure you want to delete this photo?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/parenting-gallery/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Photo deleted successfully!', 'success');
      loadGalleryItems();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// ==================== Shop Products ====================

const formatRupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Mirrors the server's price calculation so the admin sees the final selling
// price while typing, before anything is saved.
const PRODUCT_IMAGE_THUMB =
  'width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #ddd;';

// Thumbnails for every selected file, so the admin can see the gallery order
// (the first one is the cover) before saving.
function showProductImagePreviews() {
  const files = [...document.getElementById('productImage').files];
  const wrap = document.getElementById('productPreview');
  wrap.innerHTML = '';

  if (files.length > 8) {
    showAlert('You can upload up to 8 images per product.', 'error');
  }

  files.slice(0, 8).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const holder = document.createElement('div');
      holder.style.cssText = 'position:relative;';
      holder.innerHTML =
        `<img src="${e.target.result}" style="${PRODUCT_IMAGE_THUMB}" />` +
        (index === 0
          ? '<span style="position:absolute;bottom:2px;left:2px;background:#667eea;color:#fff;font-size:9px;padding:1px 5px;border-radius:6px;">Cover</span>'
          : '');
      wrap.appendChild(holder);
    };
    reader.readAsDataURL(file);
  });
}

// ---- Product description (formatted text) ----

// What a description may contain: line/paragraph structure, bold, italic,
// underline and points. Everything else is dropped or unwrapped to its text,
// and every attribute is removed — so nothing pasted in (Word styles, links,
// scripts, event handlers) survives. The shop page applies the same rules.
const DESCRIPTION_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'SPAN']);
const DESCRIPTION_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH',
  'LINK', 'META', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'HEAD', 'TITLE']);
// Blocks from pasted documents that aren't kept as-is but must still start
// a new line; headings additionally become bold.
const DESCRIPTION_HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const DESCRIPTION_BLOCKS = new Set(['BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'ASIDE',
  'FIGURE', 'FIGCAPTION', 'ADDRESS', 'DL', 'DT', 'DD', 'TR', 'CAPTION', 'HR']);

/**
 * Clean description HTML down to lines, paragraphs, bold, italic, underline
 * and points. Word, Google Docs and ChatGPT mark formatting with styles
 * (font-weight:700, font-style:italic) rather than tags, so those are turned
 * into real tags before every attribute is stripped. Anything else is
 * dropped, or unwrapped to its text.
 */
function cleanDescriptionNode(root) {
  const doc = root.ownerDocument;
  const wrapIn = (el, tag) => {
    const w = doc.createElement(tag);
    while (el.firstChild) w.appendChild(el.firstChild);
    el.appendChild(w);
  };
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) return child.remove();
      const tag = child.tagName;
      if (DESCRIPTION_DROP.has(tag)) return child.remove();
      clean(child);

      const style = child.style || {};
      const weight = String(style.fontWeight || '');
      // Google Docs wraps a whole paste in <b style="font-weight:normal">.
      if ((tag === 'B' || tag === 'STRONG') && /^(normal|lighter|[1-4]00)$/.test(weight)) {
        return child.replaceWith(...child.childNodes);
      }
      if (/^(bold|bolder|[6-9]00)$/.test(weight) && tag !== 'B' && tag !== 'STRONG') wrapIn(child, 'b');
      if (/italic|oblique/.test(style.fontStyle || '') && tag !== 'I' && tag !== 'EM') wrapIn(child, 'i');
      if (/underline/.test(style.textDecoration || style.textDecorationLine || '') && tag !== 'U') wrapIn(child, 'u');

      if (DESCRIPTION_HEADINGS.has(tag)) {
        const line = doc.createElement('div');
        const bold = doc.createElement('b');
        while (child.firstChild) bold.appendChild(child.firstChild);
        line.appendChild(bold);
        return child.replaceWith(line);
      }
      if (DESCRIPTION_BLOCKS.has(tag)) {
        const line = doc.createElement('div');
        while (child.firstChild) line.appendChild(child.firstChild);
        return child.replaceWith(line);
      }
      // Table cells: keep their text apart on the row.
      if (tag === 'TD' || tag === 'TH') {
        child.append(' ');
        return child.replaceWith(...child.childNodes);
      }
      // Docs paste every point as <li><p>…</p></li>; the extra paragraph
      // would add a gap under each point.
      if (tag === 'P' && child.parentNode && child.parentNode.tagName === 'LI') {
        return child.replaceWith(...child.childNodes);
      }
      if (!DESCRIPTION_TAGS.has(tag)) return child.replaceWith(...child.childNodes);
      [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
    });
  };
  clean(root);
  return root;
}

function sanitizeDescriptionHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  return cleanDescriptionNode(doc.body.firstElementChild).innerHTML;
}

// Descriptions saved before the editor existed are plain text with newlines.
const isDescriptionHtml = (value) => /<\/?(b|strong|i|em|u|br|p|div|ul|ol|li|span)\b/i.test(value || '');

function descriptionToEditorHtml(value) {
  if (isDescriptionHtml(value)) return sanitizeDescriptionHtml(value);
  const escaped = String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\r?\n/g, '<br>');
}

function formatProductDescription(command) {
  const editor = document.getElementById('productDescriptionEditor');
  editor.focus();
  document.execCommand(command, false, null);
}

// Pasting keeps line breaks but not the source's fonts, colours or links.
document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('productDescriptionEditor');
  if (!editor) return;
  editor.addEventListener('paste', (e) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (!html && !text) return;
    e.preventDefault();
    const safe = html ? sanitizeDescriptionHtml(html) : descriptionToEditorHtml(text);
    document.execCommand('insertHTML', false, safe);
  });
});

// The PDF has no visual preview, so confirm the pick by name instead.
function showProductPdfName() {
  const file = document.getElementById('productPdf').files[0];
  const info = document.getElementById('productPdfInfo');
  if (!file) {
    info.textContent = '';
    return;
  }
  const mb = (file.size / (1024 * 1024)).toFixed(1);
  info.textContent = `Selected: ${file.name} (${mb} MB)`;
  info.style.color = '#2e7d32';
}

function updateProductPricePreview() {
  const mrp = Number(document.getElementById('productMrp').value) || 0;
  const discount = Math.min(Math.max(Number(document.getElementById('productDiscount').value) || 0, 0), 100);
  document.getElementById('productPricePreview').textContent = formatRupees(mrp * (1 - discount / 100));
}

// ==================== Shop Disclaimer ====================

// The scrolling line at the top of /shop, stored in the database.
async function loadShopDisclaimer() {
  const field = document.getElementById('shopDisclaimerText');
  try {
    const response = await fetch(`${API_BASE_URL}/site-settings/shop-disclaimer`);
    const data = await response.json();
    if (data.success) field.value = data.data.value;
    else showAlert(data.message, 'error');
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function handleSaveShopDisclaimer(e) {
  e.preventDefault();
  const button = document.getElementById('shopDisclaimerSaveBtn');
  const field = document.getElementById('shopDisclaimerText');

  button.disabled = true;
  try {
    const response = await fetch(`${API_BASE_URL}/site-settings/shop-disclaimer`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ value: field.value }),
    });
    const data = await response.json();

    if (data.success) {
      field.value = data.data.value;
      showAlert('Shop disclaimer updated successfully!', 'success');
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function loadProducts() {
  try {
    document.getElementById('productList').innerHTML = '<div class="spinner show"></div>';

    const headers = { Authorization: `Bearer ${authToken}` };
    const [response, countsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/products`, { headers }),
      fetch(`${API_BASE_URL}/products/order-counts`, { headers }),
    ]);

    const data = await response.json();
    // The list is still useful without the counts, so a failure here just
    // leaves that column blank rather than blocking the page.
    const counts = await countsResponse.json().catch(() => null);

    if (data.success) {
      renderProductsList(data.data, counts && counts.success ? counts.data : null);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function renderProductsList(items, orderCounts) {
  if (items.length === 0) {
    document.getElementById('productList').innerHTML =
      '<div class="empty-state"><p>No products yet. Add one!</p></div>';
    return;
  }

  const html = items
    .map((item) => {
      const imageCell = item.image
        ? `<img src="${item.image}" alt="${item.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px;" />`
        : '<span style="font-size: 26px;">🛍️</span>';
      return `
    <tr>
      <td>${imageCell}</td>
      <td>${item.name}${item.hasPdf ? ' <span title="PDF attached">📄</span>' : ''}</td>
      <td>${formatRupees(item.mrp)}</td>
      <td>${item.discountPercent}%</td>
      <td><strong>${formatRupees(item.price)}</strong></td>
      <td>${item.sortOrder}</td>
      <td><strong>${orderCounts ? orderCounts[item._id || item.id] || 0 : '—'}</strong></td>
      <td><span class="badge ${item.isActive ? 'badge-success' : 'badge-danger'}">${item.isActive ? 'Active' : 'Hidden'}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit btn-sm" onclick="editProduct('${item._id || item.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${item._id || item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `;
    })
    .join('');

  document.getElementById('productList').innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>MRP</th>
            <th>Discount</th>
            <th>Price</th>
            <th title="Position in the shop (lower shows first)">Display Order</th>
            <th title="Paid orders for this product">Orders</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `;
}

async function handleSaveProduct(e) {
  e.preventDefault();

  const id = document.getElementById('productId').value;
  const isEditing = !!id;

  const descriptionEditor = document.getElementById('productDescriptionEditor');
  if (!descriptionEditor.textContent.trim()) {
    showAlert('Please add a description.', 'error');
    descriptionEditor.focus();
    return;
  }

  const formData = new FormData();
  formData.append('name', document.getElementById('productName').value);
  formData.append('description', sanitizeDescriptionHtml(descriptionEditor.innerHTML));
  formData.append('mrp', document.getElementById('productMrp').value);
  formData.append('discountPercent', document.getElementById('productDiscount').value || 0);
  formData.append('badge', document.getElementById('productBadge').value || '');
  formData.append('videoUrl', document.getElementById('productVideoUrl').value.trim());
  formData.append('sortOrder', document.getElementById('productSortOrder').value || 0);
  formData.append('isActive', document.getElementById('productActive').checked);

  // Same field name repeated — multer collects them into req.files.image.
  [...document.getElementById('productImage').files].slice(0, 8).forEach((file) => {
    formData.append('image', file);
  });

  const pdfFile = document.getElementById('productPdf').files[0];
  if (pdfFile) {
    formData.append('pdf', pdfFile);
  }

  try {
    const url = isEditing ? `${API_BASE_URL}/products/${id}` : `${API_BASE_URL}/products`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Product ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
      resetProductForm();
      loadProducts();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

async function editProduct(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success) {
      const item = data.data;

      document.getElementById('productId').value = item._id || item.id;
      document.getElementById('productName').value = item.name;
      document.getElementById('productDescriptionEditor').innerHTML = descriptionToEditorHtml(item.description);
      document.getElementById('productMrp').value = item.mrp;
      document.getElementById('productDiscount').value = item.discountPercent;
      document.getElementById('productBadge').value = item.badge || '';
      document.getElementById('productVideoUrl').value = item.videoUrl || '';
      document.getElementById('productSortOrder').value = item.sortOrder;
      document.getElementById('productActive').checked = item.isActive;
      updateProductPricePreview();

      const preview = document.getElementById('productPreview');
      const gallery = item.images && item.images.length ? item.images : item.image ? [item.image] : [];
      document.getElementById('productImage').value = '';
      preview.innerHTML = gallery.length
        ? `<p style="width:100%;margin:0 0 6px;font-size:12px;color:#555;">Current images (${gallery.length}):</p>` +
          gallery.map((src) => `<img src="${src}" style="${PRODUCT_IMAGE_THUMB}" />`).join('')
        : '<p style="margin:0;font-size:12px;color:#888;">No images yet.</p>';

      document.getElementById('productPdf').value = '';
      const pdfInfo = document.getElementById('productPdfInfo');
      pdfInfo.textContent = item.hasPdf
        ? 'A PDF is already attached. Upload a new one only to replace it.'
        : 'No PDF attached yet.';
      pdfInfo.style.color = item.hasPdf ? '#2e7d32' : '#888';

      document.getElementById('productFormTitle').textContent = 'Edit Product';
      document.getElementById('productSubmitBtn').textContent = 'Update Product';
      document.getElementById('productCancelBtn').style.display = 'block';

      document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

function resetProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  // form.reset() doesn't reach a contenteditable editor.
  document.getElementById('productDescriptionEditor').innerHTML = '';
  document.getElementById('productActive').checked = true;
  document.getElementById('productFormTitle').textContent = 'Add New Product';
  document.getElementById('productSubmitBtn').textContent = 'Add Product';
  document.getElementById('productCancelBtn').style.display = 'none';
  const preview = document.getElementById('productPreview');
  if (preview) preview.innerHTML = '';
  document.getElementById('productPdfInfo').textContent = '';
  updateProductPricePreview();
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message || 'Product deleted successfully!', 'success');
      loadProducts();
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error: ' + error.message, 'error');
  }
}

// Call on page load
window.addEventListener('load', () => {
  updateUserInfo();
  if (authToken) {
    loadCategories();
  }
});
