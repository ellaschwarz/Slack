const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const requestPromise = require('request-promise');

router.use(express.static(path.join(__dirname, '/public/')));
router.set('views', path.join(__dirname, 'views'));
router.set('view engine', 'ejs');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('index', {title: 'Express'}
  );
});

router.use(bodyParser.urlencoded({
    extended: false
}));

router.post('/message', (req, res) => {
    requestPromise('http://127.0.0.1:3000/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body),
    }).then(() => {
        res.redirect('index')
    })


router.get('/index', (req, res) => {
    requestPromise('http://127.0.0.1:3000/index', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(messages => {
        res.render('index', { "messages": JSON.parse(messages) })
    });
});

module.exports = router;