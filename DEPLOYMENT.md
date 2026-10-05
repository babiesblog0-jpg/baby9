# Deployment Guide

This guide covers deploying your Baby Food CMS to various platforms.

## Local Development Setup (Quick Start)

### On Windows

1. Install MongoDB Community Edition
2. Navigate to backend folder:
   ```bash
   cd backend
   ```
3. Run setup script:
   ```bash
   setup.bat
   ```
4. Start server:
   ```bash
   npm start
   ```

### On macOS/Linux

1. Install MongoDB:
   ```bash
   brew install mongodb-community
   mongod  # Start MongoDB
   ```
2. Navigate to backend folder and run setup:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
3. Start server:
   ```bash
   npm start
   ```

## Production Deployment

### Deploy to Heroku

1. Install Heroku CLI and login:
   ```bash
   heroku login
   ```

2. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```

3. Set environment variables:
   ```bash
   heroku config:set JWT_SECRET=your_prod_secret_key
   heroku config:set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/baby-food-cms
   heroku config:set NODE_ENV=production
   ```

4. Add Procfile:
   ```
   web: node server.js
   ```

5. Deploy:
   ```bash
   git push heroku main
   ```

### Deploy to AWS

#### Using EC2

1. Launch EC2 instance (Ubuntu 20.04)
2. Connect and install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Install MongoDB:
   ```bash
   sudo apt-get install -y mongodb
   sudo systemctl start mongodb
   ```

4. Clone and setup:
   ```bash
   git clone <your-repo>
   cd backend
   npm install
   npm run seed
   ```

5. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js
   pm2 startup
   pm2 save
   ```

### Deploy to DigitalOcean

1. Create Droplet (Ubuntu 20.04)
2. SSH into droplet
3. Install Node.js and MongoDB (same as AWS)
4. Clone repo and setup
5. Use Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Deploy to Firebase

Use Firebase Cloud Functions:

```bash
npm install -g firebase-tools
firebase init functions
firebase deploy
```

## Database Deployment

### MongoDB Atlas (Cloud)

1. Create free account at mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Update .env:
   ```env
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/baby-food-cms?retryWrites=true&w=majority
   ```

## Scaling & Performance

### Environmental Variables for Production

```env
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/baby-food-cms
JWT_SECRET=use_a_very_long_random_string_here
JWT_EXPIRE=7d
NODE_ENV=production
LOG_LEVEL=error
```

### Enable Gzip Compression

Add to server.js:

```javascript
const compression = require('compression');
app.use(compression());
```

### Caching Strategy

```javascript
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600');
  next();
});
```

## SSL/HTTPS Setup

### Using Let's Encrypt with Nginx

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

## Monitoring & Logging

### Using PM2 Plus

```bash
pm2 plus
pm2 install pm2-auto-pull
```

### Application Monitoring

Add error tracking:

```bash
npm install sentry-node
```

```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV
});
```

## Database Backup

### MongoDB Backup

```bash
mongodump --out ./backup
```

### Automated Backup

```bash
# Add to crontab for daily backups
0 2 * * * /usr/bin/mongodump --out /backups/$(date +\%Y\%m\%d)
```

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - name: Deploy to Heroku
        uses: AkhileshNS/heroku-deploy@v3.8.9
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-app-name"
          heroku_email: "your-email@example.com"
```

## Domain Setup

### DNS Configuration

Point your domain to your server:

- For Heroku: Add CNAME record to `your-app-name.herokuapp.com`
- For AWS/DigitalOcean: Add A record to server IP or CNAME to DNS

## Security Checklist

- [ ] Change default admin password
- [ ] Enable HTTPS
- [ ] Set strong JWT secret
- [ ] Enable CORS for specific domains only
- [ ] Add rate limiting
- [ ] Enable helmet for security headers
- [ ] Setup firewall rules
- [ ] Regular security updates
- [ ] Database backup strategy
- [ ] Monitor error logs

## Troubleshooting Deployment

### Port Already in Use

```bash
# Linux/Mac
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Restart MongoDB
sudo systemctl restart mongodb
```

### CORS Issues in Production

Update .env:

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

### File Upload Permissions

```bash
# Ensure uploads folder has correct permissions
sudo chown -R www-data:www-data /path/to/uploads
sudo chmod -R 755 /path/to/uploads
```

## Performance Optimization

1. **Enable Compression**: Use gzip compression
2. **Caching**: Implement Redis caching for frequently accessed data
3. **CDN**: Use CloudFlare or similar for image delivery
4. **Database Indexing**: Index frequently queried fields
5. **Load Balancing**: Use Nginx/HAProxy for multiple instances

## Maintenance

### Regular Tasks

- Monitor server health
- Review error logs daily
- Update dependencies monthly
- Backup database weekly
- Review security logs
- Test disaster recovery

### Update Dependencies

```bash
npm outdated  # See outdated packages
npm update    # Update to latest compatible versions
npm audit fix # Fix security vulnerabilities
```

## Support & Monitoring

- Set up application monitoring (New Relic, DataDog)
- Enable error tracking (Sentry, Rollbar)
- Setup log aggregation (ELK Stack, Splunk)
- Configure alerts for critical errors
