const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
const path = require('path')
const dbPath = (__dirname, 'twitterClone.db')
let db = null

//jwt token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNzE2MDk2Nzk1fQ.Z38HUTuVhSDyYSkPyOkcria2ZDlS-PO8w9zeohB5fNM
const initializeDbAndStartServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at localhost: 3000')
    })
  } catch (e) {
    console.log('DB Error ${e.message}')
    process.exit(1)
  }
}

initializeDbAndStartServer()

//api 1 register

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const userCheckQuery = `SELECT * FROM user WHERE username='${username}'`
  const userCheck = await db.get(userCheckQuery)
  if (userCheck !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const newRegisterQ = `INSERT INTO user(name,username,password,gender)
                            VALUES('${name}','${username}','${password}','${gender}')`
      const newUser = await db.run(newRegisterQ)
      response.status(200)
      response.send('User created successfully')
    }
  }
})

//api 2 login

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const userCheckQuery = `SELECT * FROM user WHERE username='${username}'`
  const userCheck = await db.get(userCheckQuery)
  if (userCheck === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, userCheck.password)
    if (isPasswordMatched === false) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'aammmmuu')
      response.send({jwtToken})
    }
  }
})

//authenticate token FUNCTION

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'aammmmuu', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//api 3
app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  let {username} = request
  const getUserId = `SELECT user_id FROM user WHERE username='${username}'`
  const followingId = `SELECT following_user_id
    FROM user join follower ON user.user_id=follower.follower_user_id WHERE user_id=${getUserId}`
  const getTweets = `SELECT username, tweet, date_time AS datetime 
  FROM (tweet join user ON user.user_id=tweet.user_id) AS T join follower on T.user_id=follower.follower_user_id 
  WHERE following_user_id=${followingId} ORDER BY date_time DESC LIMIT 4 OFFSET 1`
  const tweets = await db.all(getTweets)
  response.send(tweets)
})
