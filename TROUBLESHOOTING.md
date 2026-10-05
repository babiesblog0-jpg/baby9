# FAQ & Troubleshooting Guide

## Frequently Asked Questions

### Q: How do I change the admin password?
**A:** Login to the admin panel with current credentials, then you can create new admin users or edit existing ones through database queries.

### Q: Can I upload multiple images at once?
**A:** Currently, the system supports single image uploads per item. You can add multiple items separately.

### Q: What happens when I delete a baby food or blog?
**A:** The item and its image are permanently deleted from the database. Deletions cannot be undone, so a confirmation dialog appears first.

### Q: How do I backup my data?
**A:** Use MongoDB backup commands:
```bash
mongodump --out ./backup
```

### Q: Can I create multiple admin users?
**A:** Yes, through the backend API using the register endpoint. Edit the role in the database to make them admin.

### Q: How do I add more age groups?
**A:** Update the enums in database models:
- `backend/models/BabyFood.js`
- `backend/models/Category.js`
Then restart the server.

### Q: Is the admin panel mobile-friendly?
**A:** Yes! The admin panel uses responsive CSS and works on tablets and mobile devices.

### Q: What's the maximum file size for uploads?
**A:** 5MB per file. This is configurable in `backend/middleware/upload.js`.

### Q: Can I use a cloud database instead of local MongoDB?
**A:** Yes! Update the `MONGODB_URI` in `.env` to your MongoDB Atlas connection string.

### Q: How do I add more blog categories?
**A:** Edit `backend/models/Blog.js` enum and update the admin panel dropdown.

### Q: Can customers edit their own content?
**A:** Currently, only authenticated users (admin/editor) can create content. Users with 'editor' role can edit/delete their own posts.

## Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Solutions:**
1. Ensure MongoDB is running
   ```bash
   # Check if MongoDB is running
   sudo systemctl status mongodb
   
   # Start MongoDB if not running
   sudo systemctl start mongodb
   ```

2. Check connection string in `.env`
   ```
   MONGODB_URI=mongodb://localhost:27017/baby-food-cms
   ```

3. Verify port 27017 is not blocked
   ```bash
   netstat -an | grep 27017
   ```

4. Check MongoDB logs
   ```bash
   tail -f /var/log/mongodb/mongod.log
   ```

### Issue: "Port 5000 already in use"

**Solutions:**
```bash
# Find process using port 5000
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in .env
PORT=5001
```

### Issue: "Admin panel is completely blank"

**Solutions:**
1. Check browser console for errors (F12)
2. Verify backend API is running on correct port
3. Check CORS is enabled (it should be by default)
4. Clear browser cache (Ctrl+Shift+Delete)
5. Try private/incognito window

### Issue: "Images are not uploading"

**Solutions:**
1. Check `uploads` folder exists
   ```bash
   mkdir -p backend/uploads
   ```

2. Check folder permissions
   ```bash
   chmod 755 backend/uploads
   ```

3. Verify file size < 5MB

4. Check file format is supported (jpg, png, gif)

5. Look at server logs for detailed error

### Issue: "Login fails with correct credentials"

**Solutions:**
1. Verify admin user was created via seed
   ```bash
   npm run seed
   ```

2. Check backend console for error messages

3. Verify JWT_SECRET in `.env`

4. Try creating new user via API:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"Test@1234","name":"Test"}'
   ```

### Issue: "CORS error when accessing from React frontend"

**Solutions:**
1. Already enabled by default, but verify in `server.js`
2. For production, update `.env`:
   ```
   CORS_ORIGIN=https://yourdomain.com
   ```

3. Update `server.js` to use it:
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
   }));
   ```

### Issue: "Getting 401 Unauthorized on API calls"

**Solutions:**
1. Ensure you're sending JWT token
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```

2. Verify token hasn't expired (7 days default)

3. Check token is correctly stored and retrieved

4. Try logging in again to get fresh token

### Issue: "Getting 403 Forbidden"

**Solutions:**
1. User role is insufficient. Check:
   - Category creation requires admin role
   - Blog editing requires author or admin role

2. Verify user role in database
   ```bash
   db.users.findOne({email: "admin@babyfood.com"})
   ```

### Issue: "Cannot find API routes"

**Solutions:**
1. Verify all route files are in `routes/` folder
2. Check routes are properly imported in `server.js`
3. Verify controller files exist and are referenced correctly
4. Check for typos in route definitions

### Issue: "Uploaded images show as 404"

**Solutions:**
1. Verify file was actually uploaded
   ```bash
   ls -la backend/uploads/
   ```

2. Check image path format: `/uploads/filename.jpg`

3. Verify server serves static files
   ```javascript
   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
   ```

4. Restart server after uploading

### Issue: "Database seed fails"

**Solutions:**
1. Ensure MongoDB is running
2. Check no existing data conflicts
3. Manually clear database:
   ```bash
   mongo
   > use baby-food-cms
   > db.dropDatabase()
   > exit
   ```
4. Run seed again:
   ```bash
   npm run seed
   ```

### Issue: "Out of memory error"

**Solutions:**
1. Check uploaded file sizes
2. Limit file size in `upload.js` (default 5MB)
3. Monitor system resources:
   ```bash
   top  # Mac/Linux
   ```

## Performance Optimization

### Slow Queries?
1. Add database indexes:
   ```bash
   db.babyfoods.createIndex({ageGroup: 1})
   db.blogs.createIndex({isPublished: 1})
   ```

2. Paginate large result sets:
   ```javascript
   .limit(20).skip(skip)
   ```

### High Memory Usage?
1. Check uploaded file sizes
2. Use compression middleware
3. Implement caching

### Slow Image Loading?
1. Resize images on upload (reduce file size)
2. Use CDN for image serving
3. Implement lazy loading on frontend

## Security Troubleshooting

### Lost Admin Password?

1. Directly update database:
   ```bash
   mongo
   > use baby-food-cms
   > db.users.find()
   ```

2. Delete admin user and reseed:
   ```bash
   > db.users.deleteMany({email: "admin@babyfood.com"})
   > exit
   ```

3. Run seed again:
   ```bash
   npm run seed
   ```

### Suspicious Activity?

1. Check server logs:
   ```bash
   tail -f logs/app.log
   ```

2. Monitor API requests
3. Review uploaded files
4. Check user activity logs

## Getting Help

1. Check the documentation in `README.md`
2. Review FRONTEND_INTEGRATION.md for code examples
3. Check server console output for error messages
4. Verify environment variables in `.env`
5. Test endpoints with Postman

## Common Configuration Mistakes

❌ **Wrong:** `mongodb://mongodb:27017`  
✅ **Correct:** `mongodb://localhost:27017`

❌ **Wrong:** No JWT_SECRET set  
✅ **Correct:** `JWT_SECRET=your_long_random_string`

❌ **Wrong:** Direct password in .env (with special chars not escaped)  
✅ **Correct:** Use proper URL encoding or quotes

❌ **Wrong:** CORS disabled in production  
✅ **Correct:** CORS enabled for specific domains

❌ **Wrong:** No file upload folder  
✅ **Correct:** `mkdir backend/uploads`

## API Testing

### Using curl (Command Line)

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@babyfood.com","password":"Admin@123456"}'

# Get all baby foods
curl http://localhost:5000/api/baby-foods

# Get published blogs
curl http://localhost:5000/api/blogs?isPublished=true
```

### Using Postman

1. Download Postman
2. Import collection or create requests manually
3. Set base URL: `http://localhost:5000/api`
4. Test endpoints with proper headers and body

## Database Connection Issues (MongoDB Atlas)

If using cloud database:

1. Add IP to whitelist in MongoDB Atlas
2. Use correct connection string format:
   ```
   mongodb+srv://user:password@cluster.mongodb.net/baby-food-cms?retryWrites=true&w=majority
   ```

3. Verify credentials are URL encoded:
   - `@` → `%40`
   - `/` → `%2F`

4. Test connection:
   ```bash
   mongosh "mongodb+srv://..."
   ```

## Still Having Issues?

1. **Check Error Messages**: Read the exact error message carefully
2. **Google the Error**: Search the error message online
3. **Check Dependencies**: Verify all npm packages installed correctly
4. **Restart Everything**: Kill server, restart MongoDB, try again
5. **Fresh Install**: Remove `node_modules` and reinstall

```bash
rm -rf node_modules
npm install
npm start
```

## Support Resources

- **MongoDB Docs**: https://docs.mongodb.com/
- **Express.js Docs**: https://expressjs.com/
- **Node.js Docs**: https://nodejs.org/docs/
- **JWT Auth**: https://jwt.io/
- **Stack Overflow**: https://stackoverflow.com/

Remember: Always check the **server console** for error messages first! They usually tell you exactly what's wrong.
