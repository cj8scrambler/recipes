# Recipes App
This is a basic recipe app.  It's nothing new and there are other ones out there.  This is simply a chance for me to build one exactly how I want it and to learn some new software programming tools.

## Setup

### Database
The initial databsase schema and some example data is available in `db/`.  You'll need to get it into an SQL database that you can access.  It will be something like:
```
mysql -u myusername -p"mySecretPassword" -h db.provider.com recipes < db.sql
mysql -u myusername -p"mySecretPassword" -h db.provider.com recipes < data.sql
```

### Backend
```
cd backend/
python3 -m venv .venv
. ./.venv/bin/activate
pip install -r requirements.txt
```
The backend needs to know how to reach the database.  Put a connection string into a .env file in the backend directory.  Using the example credentials above, it would be:
```
echo "DATABASE_URL=mysql+pymysql://myusername:mySecretPassword@db.provider.com:3306/recipes" > backend/.env
```

### Frontend
I don't like installing nodejs locall, so I use a docker container for the frontend.  This script will set up the docker container and then install the frontend app:
```
docker/run.sh "cd frontend && npm ci"
```

## Running everything locally

### Backend
```
cd backend
. ./.venv/bin/activate
flask run
```
### Frontend
I run it in a docker container:
```
docker/run.sh "cd frontend && npm run dev"
```
Open a local browser at: http://localhost:5173
