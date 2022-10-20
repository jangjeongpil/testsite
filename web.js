/* 홈페이지 Node.js 기본 세팅 */
// 홈페이지 도메인 : 테스트용 핸드폰 IP 세팅
// 홈페이지 BOT ID : 테스트용 BOT Number 세팅

// node_modules의 express 패키지를 가져온다.
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

// url 모듈을 가져온다.
const http = require('http');
const request = require('request');
const fs = require('fs');

// multer를 이용하여 이미지를 업로드한다.
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'public/uploads');
    },
    filename: (req, file, callback) => {
        let base64EncodeImg = Buffer.from(file.originalname + new Date(), 'utf-8').toString('base64');
        callback(null, base64EncodeImg);
    }
});
const uploader = multer({storage:storage});

// lowdb 세팅
const low = require('lowdb'); 
const FileSync = require('lowdb/adapters/FileSync'); 
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ members: [], history: [], portfolio: [], customer: [], partner: [], tool: [], book: [], representTool: [], representBook: [], commonCode: [] }).write();

// app이라는 변수에 express 함수의 변환 값을 저장한다.
const app = express();

// 환경변수에서 port를 가져온다. 환경변수가 없을시 9000포트를 지정한다.
const port = app.listen(process.env.PORT || 9000);

// body-parser 세팅
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

// REST API의 한가지 종류인 GET 리퀘스트를 정의하는 부분.
// app.get이라고 작성했기 때문에 get 요청으로 정의가 되고 app.post로 작성할 경우 post 요청으로 정의가 된다.
// REST API의 종류 (get, post, update, delete 등등)을 사용하여 End Point를 작성하실 수 있습니다.
app.use('/', express.static(__dirname + '/public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Express Session 사용
app.use(
    session({      
        secret: "sdfgdlkfjngjk45er#@",
        store: new FileStore( {retries: 0} ),
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true, // js 코드로 쿠키를 가져오지 못하게
            secure: false // https 에서만 가져오도록 할 것인가?
        }
    })
);

// 관리자 로그인 실패 시 winston log 설정
const { createLogger, transports } = require("winston");
const logger = createLogger({
    transports: [
        new transports.Console(),
        new transports.File({ level: "error", filename: "./public/logs/error.log" }),
        new transports.File({ filename: "./public/logs/combined.log"})
    ]
});

// 게시물 고유번호를 넣기 위한 임의지정 shortid
const shortid = require('shortid');

// express 서버를 실행할 때 필요한 포트 정의 및 실행 시 Callback을 통한 console.log 확인
http.createServer(app).listen(port, function() {
    console.log('start! express server');
});
/* End Basic Setting */





/* 홈페이지 메뉴 링크 이동 */
// 메인 화면
app.get('/', function(req, res) {
    res.render('index');
});
// 회사소개 - 회사연혁
app.get('/about-company', function(req, res) {
    const historycontents = db.get('history').value();
    res.render('about-company', { historycontents } );
});
// 사업분야 - 금융서비스
app.get('/business/finance', function(req, res) {
    res.render('business/finance');
});
// 사업분야 - 플랫폼 서비스
app.get('/business/platform', function(req, res) {
    res.render('business/platform');
});
// 사업분야 - 솔루션 서비스
app.get('/business/solution', function(req, res) {
    res.render('business/solution');
});
// 솔루션 - SP1 APPS
app.get('/solution/sp1-apps', function(req, res) {
    res.render('solution/sp1-apps');
});
// 솔루션 - SP1 Framework
app.get('/solution/sp1-framework', function(req, res) {
    res.render('solution/sp1-framework');
});
// 포트폴리오 - 구축실적
app.get('/sub/portfolio', function(req, res) {
    const portfolio = db.get('portfolio').value();
    res.render('sub/portfolio', { portfolio } );
});
// 포트폴리오 - 고객사 및 협력사
app.get('/sub/partner', function(req, res) {
    const customerList = db.get('customer').value();
    const partnerList = db.get('partner').value();    
    res.render('sub/partner', { customerList, partnerList } );
});
// 인재채용 - 인재상
app.get('/recruit/talent', function(req, res) {
    res.render('recruit/talent');
});
// 인재채용 - 복리후상
app.get('/recruit/welfare', function(req, res) {
    res.render('recruit/welfare');
});
// 인재채용 - 채용정보
app.get('/recruit/employInfo', function(req, res) {
    res.render('recruit/employInfo');
});
// 문의하기
app.get('/contact', function(req, res) {
    res.render('contact');
});
/* End Homepage Menu */





/* 홈페이지 관리자 메뉴 로그인 관련 */
// tokenData : 네이버웍스 SSO 로그인 후 발급받은 액세스 토큰 정보를 담는 변수
var tokenData = "";
// login_id : 네이버웍스 SSO 로그인 후 발급받은 액세스 토큰의 사용자가 누구인지 담는 변수
var login_id = "";
// 관리자 로그인 화면
app.get('/admin', function(req, res) {
    /* 모바일 유무 변수 */
    let page_mobileYN = "";
    let mobile_mainYN = "";
    /* Express session에서 mobile로 접속했다고 판단되면 변수에 Y를 담아서 렌더링 */
    if(session.mobileYN == "Y") {
        page_mobileYN = "Y";
        /* Express session에 로그인 정보가 없는 경우 로그인 화면으로 이동 */
        if(req.session.user == null || (db.get('members').find({ email: login_id }).value() == null)) {
            res.render('admin/admin', { page_mobileYN, mobile_mainYN });
        }else {
        /* Express session에 로그인 정보가 있는 경우 메인 화면으로 이동 */
            res.redirect('/admin/main');
        }
    }else {
        /* Express session에 로그인 정보가 없는 경우 로그인 화면으로 이동 */
        if(req.session.user == null || (db.get('members').find({ email: login_id }).value() == null)) {
            res.render('admin/admin', { page_mobileYN, mobile_mainYN });
        }else {
        /* Express session에 로그인 정보가 있는 경우 메인 화면으로 이동 */
            res.redirect('/admin/main');
        }
    }
});
// 관리자 로그인 Redirect URL
app.get('/admin/login', function(req, res) { 
    res.render('admin/adminlogin');
});
// 토큰 발행 프로세스
app.post('/admin/tokenProcess', function(req, res) {
    let data = req.body;
    let options = {			 
        url: 'https://auth.worksmobile.com/oauth2/v2.0/token',
        method: 'POST',			 
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + data.code + '&grant_type=' + data.grant_type + '&client_id=' + data.client_id + '&client_secret=' + data.client_secret
    }
    request(options, (error, response, body) => {
        console.log('token error:', error);
        console.log('token statusCode:', response && response.statusCode);    
        tokenData = JSON.parse(body);
        tokenData = tokenData.access_token;
    });
});
// 토큰 발행 -> SP1SOFT 구성원 정보 불러온 후 DB 저장
app.post('/admin/memberProcess', function(req, res) {
    /* 핸드폰 번호 플래터 */
    function phoneFomatter(num, type) {
        var formatNum = '';     
        if(num.length == 11){
            if(type == 0) {
                formatNum = num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
            }else {
                formatNum = num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
            }
        }else if(num.length == 8) {
            formatNum = num.replace(/(\d{4})(\d{4})/, '$1-$2');
        }else {
            if(num.indexOf('02') == 0){
                if(type == 0){
                    formatNum = num.replace(/(\d{2})(\d{4})(\d{4})/, '$1-****-$3');
                }else {
                    formatNum = num.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
                }
            }else {
                if(type == 0) {
                    formatNum = num.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
                }else {
                    formatNum = num.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                }
            }
        }
        return formatNum; 
    }

    if(tokenData != "") {
        let options = {
            url: 'https://www.worksapis.com/v1.0/users',
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json; charset=UTF-8"
            }
        } 
        request(options, (error, response, body) => {
            console.log('member error:', error);
            console.log('member statusCode:', response && response.statusCode);    
            // 토큰의 에러코드가 401번이 아니어야 SSO 회원정보를 호출함
            if(response.statusCode != 401) {
                /* API 호출을 통해 내려받은 회사 직원 정보 */
                let data = JSON.parse(body);
                data = data.users;
                for(let i = 0; i < data.length; i++) {
                    /* employmentTypeName : 일반직 or 계약직 */
                    let employmentTypeNameData = data[i].employmentTypeName;
                    if(employmentTypeNameData != '계약직') {
                        /* cellPhone(휴대폰 번호) 정보를 필터링하여 플래팅 */
                        let phoneData = data[i].cellPhone + "";
                        let phoneSub = "";
                        let phoneNum = "";
                        if(phoneData.includes('+82')) {
                            phoneSub = phoneData.substring(4);
                            if(phoneSub.charAt(0) == '1') {
                                phoneNum = phoneFomatter('0' + phoneSub);
                            }else{
                                phoneNum = phoneFomatter(phoneSub);
                            }            
                        }else {
                            phoneNum = phoneFomatter(phoneData);
                        }
                        /* isAdministrator : 회사 네이버웍스 최고 관리자 유무(김기범 대표이사님에게만 적용)*/
                        let isAdminData = data[i].isAdministrator;
                        /* task : 회사 네이버웍스 업무 구분(윤지훈 과장님, 김은영 과장님에게 자동 적용) */
                        let taskData = data[i].task;
                        let adminLevel = "사용자";
                        if(isAdminData == true) {
                            adminLevel = "슈퍼관리자";
                        }
                        if(taskData == "사업관리" || taskData == "경영지원") {
                            adminLevel = "관리자";
                        }
                        /* db 조회 후 사용자가 없는 경우 db에 자동으로 회원정보 입력 */
                        let dbMember = db.get('members').find({ email: data[i].email }).value();
                        if(dbMember == null) {
                            db.get('members').push({
                                email: data[i].email,
                                name: data[i].userName.lastName + data[i].userName.firstName,
                                level: data[i].organizations[0].levelName,
                                phone: phoneNum,
                                userId: data[i].userId,
                                adminlevel: adminLevel,
                                botAdmin: "N"
                            }).write();
                        };    
                    }
                }
            }else {
                /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */
                req.session.destroy(err => {
                    if (err) {
                        console.log(error);
                        return res.status(500).send("<h1>500 error</h1>");
                    }
                    res.render('admin/adminlogout');
                });
            }
        }).end();
    }
});
// 토큰 발행 -> SP1SOFT 구성원 정보 불러온 후 DB 저장 -> 해당 토큰을 발행한 사람이 누구인지 여부 판단 후 로그인 변수에 정보 기입
app.post('/admin/loginProcess', function(req, res) {
    if(tokenData != "") {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/users/me',
            method: 'GET',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json; charset=UTF-8"
            }
        } 
        request(options, (error, response, body) => {
            console.log('login error:', error);
            console.log('login statusCode:', response && response.statusCode);    
            /* 토큰의 에러코드가 401번이 아니어야 SSO 회원정보를 호출함 */
            if(response.statusCode != 401) {
                /* API 호출을 통해 내려받은 회사 직원 정보 */
                let data = JSON.parse(body);
                /* 토큰 발행 구성원의 정보를 로그인 변수에 기입 */
                login_id = data.email;
            }else {
            /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */
                req.session.destroy(err => {
                    if (err) {
                        console.log(error);
                        return res.status(500).send("<h1>500 error</h1>");
                    }
                    res.render('admin/adminlogout');
                });
            }
        });
    }else {
        /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */
        req.session.destroy(err => {
            if (err) {
                console.log(error);
                return res.status(500).send("<h1>500 error</h1>");
            }
            res.render('admin/adminlogout');
        });
    }
});
// logout 요청
app.get("/admin_logout", (req, res) => {
    /* Express session 삭제 후 로그아웃 페이지로 렌더링 */
    req.session.destroy(err => {
        if (err) {
            console.log(error);
            return res.status(500).send("<h1>500 error</h1>");
        }
        res.render('admin/adminlogout');
    });
});
/* End Admin Login */





/* 홈페이지 관리자 메인화면 */
app.get('/admin/main', function(req, res, next) {
    const historycontents = db.get('history').value();
    const portfolio = db.get('portfolio').value();
    const customerList = db.get('customer').value();
    const partnerList = db.get('partner').value();
    let page_mobileYN = "";
    let mobile_mainYN = "";
    /* query에서 mobile 접속여부가 Y이면 변수에 Y를 담아서 렌더링 */
    if(req.query.mobileYN != null) {
        mobile_mainYN = "Y";
    }
    
    /* db에 정보가 없는 경우 로그인 화면으로 이동 */
    if(db.get('members').find({ email: login_id }).value() == null) {
        res.render('admin/admin', { page_mobileYN, mobile_mainYN });
    }else {
        /* Express session에 로그인 정보가 없을 때 login_id 변수로 db를 검색하여 session에 저장 후 winston log 기록 및 메인페이지로 이동 */
        if(req.session.user == null) {
            let loginMember = db.get('members').find({ email: login_id }).value();      
            req.session.user = loginMember;
            req.session.save(err => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("<h1>500 error</h1>");
                }      
                try {
                    // 로그인 성공 시 login log 기록
                    logger.info("Login 접속자 : " + req.session.user.name);  
                } catch (err) {
                    // 에러 발생 시 error log 기록
                    logger.error(err.message);
                    res.render('admin/admin', { page_mobileYN, mobile_mainYN });
                }
                /* 모바일 접속인 경우 중에 BOT 대화 기능을 통해 로그인하였을 때 한 번만 자동으로 종료되게끔 처리 */
                if(session.mobileYN == "Y") {
                    session.mobileYN = "N";
                    res.write("<script>window.location=\"/bot/botclose\"</script>");                    
                }else {
                    res.render('admin/adminmain', { historycontents, portfolio, customerList, partnerList, loginMember } );    
                }
            });
        }else {
            /* 로그인 되어 있는 상태에는 절차 생략 후 바로 메인페이지로 이동 */
            let options = {			 
                url: 'https://www.worksapis.com/v1.0/users/me',
                method: 'GET',			 
                headers: {
                    "Authorization": "Bearer " + tokenData,
                    "Content-Type": "application/json"
                }
            }
            request(options, (error, response, body) => {
                if(response.statusCode != 401) {
                    /* 토큰이 정상인 경우 메인페이지로 이동 */
                    let loginMember = db.get('members').find({ email: req.session.user.email }).value();
                    res.render('admin/adminmain', { historycontents, portfolio, customerList, partnerList, loginMember } ); 
                }else {   
                    /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */
                    res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
                    res.write("<script>alert('토큰이 만료되었습니다.');</script>");
                    req.session.destroy(err => {
                        if (err) {
                            console.log(error);
                            return res.status(500).send("<h1>500 error</h1>");
                        }
                        res.write("<script>window.location=\"/admin_logout\"</script>"); 
                    });       
                }                  
            });
        }
    }
});
/* End Admin Main */





/* 
화면 메뉴 부분 공통 정보
- 소스코드 순서 : 
    공통항목 : 화면 페이지(목록화면, 작성화면, 수정화면 등) -> 기능(등록, 수정, 삭제) 순서.
              ※ 예외: 모바일 화면 페이지는 기능 아래에 위치.
    1. 회사연혁 목록
    2. 포트폴리오(구축실적 -> 고객사 및 협력사)
    3. 사용자관리
    4. 공통코드관리
    5. BOT관리(호출 -> 프로세스 -> 대표장비 -> 대표도서 -> 메시지 편집)
    6. 장비관리
    7. 도서관리

- admin_level : 관리자 권한 등급 : 슈퍼관리자, 관리자, 사용자
    - 사용자 : 장비 목록, 장비 사용신청, 장비 반납신청, 도서 목록, 도서 사용신청, 도서 반납신청 외 화면 진입 불가
    - 관리자 : 사용자관리 메뉴 제외 전메뉴 진입 가능
    - 슈퍼관리자 : 전메뉴 진입 가능

- loginMember : 접속한 사용자의 정보

- 변수명 = db.get('db명').value() : 각 메뉴에 해당하는 lowdb 컬럼값을 담은 정보
- lowdb push : db 정보 등록
- lowdb assign write : db 정보 수정
- lowdb remove : db 정보 삭제
- lowdb find : db 정보 검색(1개 데이터만 조회 가능)
- lowdb filter : db 정보 검색(다건 조회 가능)

- res.render('파일 경로명. 확장자 생략', { 해당 경로명에 넣어줄 변수 } ) : get('href 경로')에 파일 경로를 렌더링(연결). 파일 한 개당 한 번만 연결 가능(href 경로 - 파일 경로)
- res.redirect('href 경로') : 이 페이지로 이동

- Base64 : 64진법. Base64 Encoding은 Binary Data를 Text로 변경하는 Encoding
- serial = shortid.generate() : 게시물의 고유번호 설정을 위한 임의 id 발급 변수
- userId : BOT에 사용되는 유저 고유 넘버링
- pageNum : page 넘버링에 사용되는 변수
- useNumber : 장비 또는 도서를 사용신청할 때 사용신청 메뉴가 아닌 [사용신청] 버튼을 통해 다이렉트로 신청하였을 경우 정보를 담아두는 변수
*/





/* 홈페이지 관리자 회사소개 - 회사연혁 */
// 회사연혁 목록 페이지
app.get('/admin/history', function(req, res) { 
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    const historycontents = db.get('history').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/history/adminhistory', { historycontents, loginMember }); 
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 회사연혁 작성 페이지
app.get('/admin/history/write', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/history/adminhistorywrite', { loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    } 
});
// 회사연혁 수정 페이지
app.get('/admin/history/modify', function(req, res) {
    const serial = req.query.serial; // 게시글 시리얼 확인
    const contentsOne = db.get('history').find({ serial: serial }).value();   
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/history/adminhistorymodify', { contentsOne, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }     
});
// 회사연혁 - 등록
app.post('/history_create', function(req, res) {
    let body = req.body;
    let year = body.year;
    let month = body.month;
    let number = body.number;
    let customer = body.customer;
    let project = body.project;
    let hiddenYN = body.hiddenYN;
    let writer = body.writer;
    let date = body.date;
    
    // lowdb history 항목 정보 등록
    let serial = shortid.generate();
    db.get('history').push({
        serial: serial,
        year: year,
        month: month,
        number: number,
        customer: customer,
        project: project,
        hiddenYN: hiddenYN,
        writer: writer,
        date: date
    }).write();
    res.redirect('/admin/history');
});
// 회사연혁 - 수정
app.post('/history_update', function(req, res) {
    let body = req.body;
    let serial = body.serial;
    let year = body.year;
    let month = body.month;
    let number = body.number;
    let customer = body.customer;
    let project = body.project;
    let hiddenYN = body.hiddenYN;
    let modifier = body.modifier;
    let modifydate = body.modifydate;
 
    // lowdb history 항목 정보 수정
    db.get('history').find({serial: serial}).assign({
        year: year,
        month: month,
        number: number,
        customer: customer,
        project: project,
        hiddenYN: hiddenYN,
        modifier: modifier,
        modifydate: modifydate
    }).write();
    res.redirect('/admin/history');
});
// 회사연혁 - 삭제
app.get('/admin/history_delete', (req, res) => {
    let serial = req.query.serial; // 게시글 시리얼 확인 
    
    // lowdb history 항목 serial에 해당하는 정보 삭제
    db.get('history').remove({serial: serial}).write();
    res.redirect('/admin/history');
});
// 회사연혁 - 체크박스 선택 삭제
app.post('/history_checkdelete', function(req, res) {
    let data = req.body;
    /* for문을 통해 다중삭제 처리 */
    for(let i = 0; i < data.length; i++) {
        let serial = data[i].serial;
        db.get('history').remove({serial: serial}).write();
    }
});
/* End History Menu */





/* 홈페이지 관리자 포트폴리오 */
// 구축실적 목록 페이지
app.get('/admin/portfolio', function(req, res) {   
    const portfolio = db.get('portfolio').value();
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/portfolio/adminportfolio', { portfolio, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 구축실적 작성 페이지
app.get('/admin/portfolio/write', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/portfolio/adminportfoliowrite', { loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 구축실적 수정 페이지
app.get('/admin/portfolio/modify', function(req, res) {  
    const serial = req.query.serial; // 게시글 시리얼 확인
    const portfolioOne = db.get('portfolio').find({ serial: serial }).value();   
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/portfolio/adminportfoliomodify', { portfolioOne, loginMember });
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 구축실적 - 등록
app.post('/portfolio_create', uploader.single('imagefile'), (req, res) => {
    let body = req.body;
    let customer = body.customer;
    let project = body.project;
    let startterm = body.startterm;
    let endterm = body.endterm;
    let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
    let hiddenYN = body.hiddenYN;
    let writer = body.writer;
    let date = body.date;
    let serial = shortid.generate();
    let base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');

    db.get('portfolio').push({
        serial: serial,
        customer: customer,
        project: project,
        startterm: startterm,
        endterm: endterm,
        imagename: base64EncodeImg,
        hiddenYN: hiddenYN,
        writer: writer,
        date: date
    }).write();
    res.redirect('/admin/portfolio');
});
// 구축실적 - 수정
app.post('/portfolio_update', function(req, res) {
    let body = req.body;
    let serial = body.serial;
    let customer = body.customer;
    let project = body.project;
    let startterm = body.startterm;
    let endterm = body.endterm;
    let hiddenYN = body.hiddenYN;
    let modifier = body.modifier;
    let modifydate = body.modifydate;
    let base64EncodeImg = '';

    /* 파일을 등록한 경우에는 이미지 파일 경로 새로 교체, 등록하지 않은 경우에는 기존 파일 경로 그대로 사용 */
    if(req.file != null) {
        let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
        base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');
        let deleteInfo = db.get('portfolio').find({serial: serial}).value();
        fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 기존 이미지 파일 삭제
    }else {
        let oldfile = db.get('portfolio').find({ serial: serial }).value();
        base64EncodeImg = oldfile.imagename;
    }  

    db.get('portfolio').find({serial: serial}).assign({
        customer: customer,
        project: project,
        startterm: startterm,
        endterm: endterm,
        imagename: base64EncodeImg,
        hiddenYN: hiddenYN,
        modifier: modifier,
        modifydate: modifydate
    }).write();
    res.redirect('/admin/portfolio');
});
// 구축실적 - 삭제
app.get('/admin/portfolio_delete', (req, res) => {
    let serial = req.query.serial; // 게시글 시리얼 확인 
    let deleteInfo = db.get('portfolio').find({serial: serial}).value(); // 게시글 시리얼을 통해 이미지 파일 조회
    
    db.get('portfolio').remove({serial: serial}).write(); // db 정보 삭제
    fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 이미지 파일 삭제
    res.redirect('/admin/portfolio');
});
// 구축실적 - 체크박스 선택 삭제
app.post('/portfolio_checkdelete', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let serial = data[i].serial;
        db.get('portfolio').remove({serial: serial}).write();
    }
});

// 고객사 및 협력사 목록 페이지
app.get('/admin/partner', function(req, res) {
    const customerList = db.get('customer').value();
    const partnerList = db.get('partner').value();
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/partner/adminpartner', { customerList, partnerList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 고객사 및 협력사 작성 페이지
app.get('/admin/partner/write', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/partner/adminpartnerwrite', { loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }     
});
// 고객사 및 협력사 수정 페이지
app.get('/admin/partner/modify', function(req, res) {
    const serial = req.query.serial; // 게시글 시리얼 확인
    const customerOne = db.get('customer').find({ serial: serial }).value();
    const partnerOne = db.get('partner').find({ serial: serial }).value();   
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/partner/adminpartnermodify', { customerOne, partnerOne, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }       
});
// 고객사 - 등록
app.post('/customer_create', uploader.single('imagefile'), (req, res) => {
    let body = req.body;
    let companyOption = body.companyOption;
    let companyName = body.companyName;
    let link = body.link;
    let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
    let hiddenYN = body.hiddenYN;
    let writer = body.writer;
    let date = body.date;
    let serial = shortid.generate();
    let base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');

    db.get('customer').push({
        serial: serial,
        companyOption: companyOption,
        companyName: companyName,
        link: link,
        imagename: base64EncodeImg,
        hiddenYN: hiddenYN,
        writer: writer,
        date: date
    }).write();
    res.redirect('/admin/partner');
});
// 고객사 - 수정
app.post('/customer_update', function(req, res) {
    let body = req.body;
    let serial = body.serial;
    let companyOption = body.companyOption;
    let companyName = body.companyName;
    let link = body.link;
    let hiddenYN = body.hiddenYN;
    let modifier = body.modifier;
    let modifydate = body.modifydate; 
    let base64EncodeImg = "";

    /* 파일을 등록한 경우에는 이미지 파일 경로 새로 교체, 등록하지 않은 경우에는 기존 파일 경로 그대로 사용 */
    if(req.file != null) {
        let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
        base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');
        let deleteInfo = db.get('customer').find({serial: serial}).value();
        fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 기존 이미지 파일 삭제
    }else {
        let oldfile = db.get('customer').find({ serial: serial }).value();
        base64EncodeImg = oldfile.imagename;
    }  

    db.get('customer').find({serial: serial}).assign({
        companyOption: companyOption,
        companyName: companyName,
        imagename: base64EncodeImg,
        link: link,
        hiddenYN: hiddenYN,
        modifier: modifier,
        modifydate: modifydate
    }).write();
    res.redirect('/admin/partner');
});
// 고객사 - 삭제
app.get('/admin/customer_delete', (req, res) => {
    let serial = req.query.serial; // 게시글 시리얼 확인 
    let deleteInfo = db.get('customer').find({serial: serial}).value(); // 게시글 시리얼을 통해 이미지 파일 조회

    db.get('customer').remove({serial: serial}).write(); // db 정보 삭제
    fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 이미지 파일 삭제
    res.redirect('/admin/partner');
});
// 협력사 - 등록
app.post('/partner_create', uploader.single('imagefile'), (req, res) => {
    let body = req.body;
    let companyOption = body.companyOption;
    let companyName = body.companyName;
    let link = body.link;
    let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
    let hiddenYN = body.hiddenYN;
    let writer = body.writer;
    let date = body.date;
    let serial = shortid.generate();
    let base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');

    db.get('partner').push({
        serial: serial,
        companyOption: companyOption,
        companyName: companyName,
        link: link,
        imagename: base64EncodeImg,
        hiddenYN: hiddenYN,
        writer: writer,
        date: date
    }).write();
    res.redirect('/admin/partner');
});
// 협력사 - 수정
app.post('/partner_update', function(req, res) {
    let body = req.body;
    let serial = body.serial;
    let companyOption = body.companyOption;
    let companyName = body.companyName;
    let link = body.link;
    let hiddenYN = body.hiddenYN;
    let modifier = body.modifier;
    let modifydate = body.modifydate; 
    let base64EncodeImg = "";

    if(req.file != null) {
        let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
        base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');
        let deleteInfo = db.get('partner').find({serial: serial}).value();
        fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 기존 이미지 파일 삭제
    }else {
        let oldfile = db.get('partner').find({ serial: serial }).value();
        base64EncodeImg = oldfile.imagename;
    }  

    db.get('partner').find({serial: serial}).assign({
        companyOption: companyOption,
        companyName: companyName,
        imagename: base64EncodeImg,
        link: link,
        hiddenYN: hiddenYN,
        modifier: modifier,
        modifydate: modifydate
    }).write();
    res.redirect('/admin/partner');
});
// 협력사 - 삭제
app.get('/admin/partner_delete', (req, res) => {
    let serial = req.query.serial; // 게시글 시리얼 확인 
    let deleteInfo = db.get('partner').find({serial: serial}).value(); // 게시글 시리얼을 통해 이미지 파일 조회
    
    db.get('partner').remove({serial: serial}).write(); // db 정보 삭제
    fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 이미지 파일 삭제
    res.redirect('/admin/partner');
});
/* End Portfolio Menu */





/* 홈페이지 관리자 사용자관리 */
// 사용자 목록 페이지
app.get('/admin/member', function(req, res) {        
    const memberList = db.get('members').value();
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/member/adminmember', { memberList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 사용자 등급 수정 페이지
app.get('/admin/member/modify', function(req, res) {
    const email = req.query.email;
    const memberOne = db.get('members').find({ email: email }).value();
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/member/membermodify', { memberOne, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 사용자 등급 - 수정
app.post('/member_update', function(req, res) {
    let body = req.body;
    let email = body.email;
    let adminlevel = body.adminlevel;
    
    db.get('members').find({email: email}).assign({
        adminlevel: adminlevel
    }).write();
    res.redirect('/admin/member');
});
// 사용자 - 삭제
/* 퇴사직원 정보를 삭제하기 위한 기능. 재직중인 직원은 api 호출로 인해 자동 재등록 */
app.post('/member_checkdelete', (req, res) => {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let email = data[i].email;
        db.get('members').remove({email: email}).write();
    }
    res.redirect('/admin/member');
});
/* End Member Menu */





/* 홈페이지 관리자 공통코드관리 */
// 공통코드 목록 페이지
app.get('/admin/code', function(req, res) {
    const codeList = db.get('commonCode').value();
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/code/admincode', { codeList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 공통코드 추가 페이지
app.get('/admin/code/write', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/code/admincodewrite', { loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 공통코드 수정 페이지
app.get('/admin/code/modify', function(req, res) {
    const codeName = req.query.codeName;
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    const codeOne = db.get('commonCode').find({ codeName: codeName }).value();

    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/code/admincodemodify', { codeOne, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// 공통코드 - 등록
app.post('/code_create', function(req, res) {
    let body = req.body;
    let codeName = body.codeName;
    let optionArr = [];
    let writer = body.writer;
    let date = body.date;

    if(Array.isArray(body.codeOption) == true) {
        for(let i = 0; i < body.codeOption.length; i++) {
            optionArr[i] = body.codeOption[i];
        }
    }else {
        optionArr = body.codeOption;
    }
    db.get('commonCode').push({
        codeName: codeName,
        codeOption: optionArr,
        writer: writer,
        date: date
    }).write();
    res.redirect('/admin/code');
});
// 공통코드 - 수정
app.post('/code_update', function(req, res) {
    let body = req.body;
    let codeName = body.codeName;
    let optionArr = [];
    let modifier = body.modifier;
    let modifydate = body.modifydate; 

    for(let i = 0; i < body.codeOption.length; i++) {
        optionArr[i] = body.codeOption[i];
    }

    db.get('commonCode').find({codeName: codeName}).assign({
        codeOption: optionArr,
        modifier: modifier,
        modifydate: modifydate
    }).write();
    res.redirect('/admin/code');
});
// 공통코드 - 체크박스 선택 삭제
app.post('/code_checkdelete', (req, res) => {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let codeName = data[i].codeName;
        db.get('commonCode').remove({codeName: codeName}).write();
    }
});
/* End CommonCode Menu */





/* 홈페이지 관리자 BOT관리 */
// BOT 호출 메시지 설정
var messageData1 = {
    "content": {
        "type": "text",
        "text": "장비 사용신청이 완료되었습니다.",
    }
};
var messageData2 = {
    "content": {
        "type": "text",
        "text": "장비 반납신청이 완료되었습니다.",
    }
}; 
var messageData3 = {
    "content": {
        "type": "text",
        "text": "도서 대여신청이 완료되었습니다.",
    }
};
var messageData4 = {
    "content": {
        "type": "text",
        "text": "도서 반납신청이 완료되었습니다.",
    }
};
var messageData5 = {
    "content": {
        "type": "link",
        "contentText": "사용신청된 장비가 있습니다.\n 확인처리가 필요합니다",
        "linkText": "장비 사용확인",
        "link": "http://192.168.160.186:9000/admin/tool/mobile_use_check"
    }
};      
var messageData6 = {
    "content": {
        "type": "link",
        "contentText": "대여신청된 도서가 있습니다.\n 확인처리가 필요합니다",
        "linkText": "도서 대여확인",
        "link": "http://192.168.160.186:9000/admin/book/mobile_use_check"
    }
};
var messageData7 = {
    "content": {
        "type": "link",
        "contentText": "반납신청된 장비가 있습니다.\n 확인처리가 필요합니다",
        "linkText": "장비 반납확인",
        "link": "http://192.168.160.186:9000/admin/tool/mobile_return_check"
    }
};    
var messageData8 = {
    "content": {
        "type": "link",
        "contentText": "반납신청된 도서가 있습니다.\n 확인처리가 필요합니다",
        "linkText": "도서 반납확인",
        "link": "http://192.168.160.186:9000/admin/book/mobile_return_check"
    }
};
var menuMessageData1 = {
    "content": {
        "type": "text",
        "text": "안녕하세요. 정필봇입니다.\n 무엇을 도와드릴까요?",
    }
};
let menuMessageData2 = {
    "content": {
        "type": "link",
        "contentText": "반납해야 할 장비가 있습니다.\n 클릭하시면 목록으로 이동합니다.",
        "linkText": "반납장비 목록",
        "link": "http://192.168.160.186:9000/admin/tool/returnlist"
    }
};
let menuMessageData3 = {
    "content": {
        "type": "text",
        "text": "반납하실 장비가 없습니다.",
    }
};
let menuMessageData4 = {
    "content": {
        "type": "link",
        "contentText": "반납해야 할 도서가 있습니다.\n 클릭하시면 목록으로 이동합니다.",
        "linkText": "반납도서 목록",
        "link": "http://192.168.160.186:9000/admin/book/returnlist"
    }
};
let menuMessageData5 = {
    "content": {
        "type": "text",
        "text": "반납하실 도서가 없습니다.",
    }
};
var carouselBtn1 = {
    "content": {
        "type": "flex",
        "altText": "메뉴를 시작합니다.",
        "contents": 
            {
            "type": "carousel",
            "contents": [
                {
                    "type": "bubble",
                    "size": "kilo",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "장비 메뉴",
                                        "weight": "bold",
                                        "size": "xl",
                                        "align": "center",
                                        "color": "#000000",
                                    }
                                ],
                                "margin": "xl"
                            }
                        ]
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "button",
                                "action": {
                                    "type": "uri",
                                    "label": "사용신청",
                                    "uri": "http://192.168.160.186:9000/bot/process?querydata=tooluseapply"
                                },
                                "color": "#0E71EB",
                                "style": "primary",
                                "height": "sm"
                            },
                            {
                                "type": "button",
                                "action": {
                                    "type": "uri",
                                    "label": "반납신청",
                                    "uri": "http://192.168.160.186:9000/bot/process?querydata=toolreturnapply"
                                },
                                "margin": "md",
                                "color": "#0E71EB",
                                "style": "primary",
                                "height": "sm"
                            },
                            {
                                "type": "button",
                                "action": {
                                    "type": "uri",
                                    "label": "전체목록",
                                    "uri": "http://192.168.160.186:9000/admin/tool/alllist"
                                },
                                "margin": "md",
                                "color": "#0E71EB",
                                "style": "primary",
                                "height": "sm"
                            }
                        ]
                    }
                },
                {
                    "type": "bubble",
                    "size": "kilo",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "도서 메뉴",
                                        "weight": "bold",
                                        "size": "xl",
                                        "align": "center",
                                        "color": "#000000",
                                    }
                                ],
                                "margin": "xl"
                            }
                        ]
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "button",
                                "action": {
                                    "type": "uri",
                                    "label": "대여신청",
                                    "uri": "http://192.168.160.186:9000/bot/process?querydata=bookuseapply"
                                },
                                "color": "#0E71EB",
                                "style": "primary",
                                "height": "sm"
                            },
                            {
                                "type": "button",
                                "action": {
                                    "type": "uri",
                                    "label": "반납신청",
                                    "uri": "http://192.168.160.186:9000/bot/process?querydata=bookreturnapply"
                                },
                                "margin": "md",
                                "color": "#0E71EB",
                                "style": "primary",
                                "height": "sm"
                            },
                            {
                                "type": "button",
                                "action": {
                                    "type": "uri",
                                    "label": "전체목록",
                                    "uri": "http://192.168.160.186:9000/admin/book/alllist"
                                },
                                "margin": "md",
                                "color": "#0E71EB",
                                "style": "primary",
                                "height": "sm"
                            }
                        ]
                    }
                }
            ]
        }       
    }
}
// BOT 메뉴 등록건. 추후 삭제 예정
/*
    var menuData_add = {
        "content": {
            "actions": [
                {
                "type": "uri",
                "label": "정필봇 시작하기(메뉴)",
                "uri": "http://192.168.160.186:9000/admin/main?mobileYN=Y",
                },
                {
                "type": "uri",
                "label": "정필봇 시작하기(대화)",
                "uri": "http://192.168.160.186:9000/admin/bot",
                }                            
            ]
        }
    }
    let options_add = {			 
        url: 'https://www.worksapis.com/v1.0/bots/3835292/persistentmenu',
        method: 'POST',			 
        headers: {
            "Authorization": "Bearer " + tokenData,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(menuData_add)
    }
    request(options_add, (error, response, body) => {
        console.log('bot error:', error);
        console.log('bot statusCode:', response && response.statusCode);
    });
*/
// BOT menu 페이지
app.get('/bot/menu', function(req, res, next) {
    let admin_level = "";
    let representTool = db.get('representTool').filter({ representYN: "Y" }).value();
    let representBook = db.get('representBook').filter({ representYN: "Y" }).value();
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    let selectMenu = "";
    if(req.query.selectMenu != undefined || req.query.selectMenu != null) {
        selectMenu = req.query.selectMenu;
    }

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/bot/botmenu', { representTool, representBook, selectMenu, loginMember } );
    }else {
        res.write("<script>window.location=\"/admin\"</script>");
    }  
});
app.get('/admin/bot', function(req, res) {
    let admin_level = "";
    let userId = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
            userId = req.session.user.userId;
        }  
    }  
    let first = new Promise(function(resolve, reject) {
        resolve();
        reject();
    });

    first.then(() => {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(menuMessageData1)
        }
        request(options, (error, response, body) => {
            console.log('chatbot1 error:', error);
            console.log('chatbot1 statusCode:', response && response.statusCode);
        });
    }).then(() => {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(carouselBtn1)
        }
        setTimeout(function() {   
            request(options, (error, response, body) => {
                console.log('chatbot2 error:', error);
                console.log('chatbot2 statusCode:', response && response.statusCode);
                if(response.statusCode != 401) {
                    res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                }else {
                    /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                    req.session.destroy(err => {
                        if (err) {
                            console.log(error);
                            return res.status(500).send("<h1>500 error</h1>");
                        }
                        /* Express Session에 모바일 접속 여부를 기입한다 */
                        session.mobileYN = "Y";
                        res.write("<script>window.location=\"/admin_logout\"</script>"); 
                    });       
                }                  
            });
        }, 10);
    }).catch(() => {
        console.log('bot call error!');
    }); 

    if(admin_level == "") {
        /* Express Session에 모바일 접속 여부를 기입한다 */
        session.mobileYN = "Y";
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// BOT 인앱 브라우저 종료 페이지.
app.get('/bot/botclose', function(req, res, next) {  
    res.render('admin/bot/botclose');
});
// BOT process 페이지. 네이버웍스 BOT 메뉴 클릭 시 Redirect 해주는 로직 페이지
app.get('/bot/process', function(req, res, next) {  
    let admin_level = "";
    let userId = "";
    let queryData = req.query.querydata; 
    let representTool = db.get('representTool').filter({ representYN: "Y" }).value();
    let representBook = db.get('representBook').filter({ representYN: "Y" }).value();
    let toolList = [];
    let toolData = db.get('tool').filter({ useYN: "Y" }).value();
    let bookList = [];
    let bookData = db.get('book').filter({ useYN: "Y" }).value();

    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
            userId = req.session.user.userId;
        }  
    }  

    // 네이버웍스 Request Data 형식에 맞게 자르기 및 JSON 형태로 변환
    for(let j = 0; j < toolData.length; j++) {
        toolList.push({"productType": toolData[j].productType});
    }
    for(let j = 0; j < bookData.length; j++) {
        bookList.push({"bookType": bookData[j].bookType});
    }

    // JSON -> 네이버웍스 형태 JSON으로 재변환
    let btn1DataActions = [];
    // 대표장비가 10개 이상 설정되어 있는 경우 9개까지만 보여지며 마지막은 더보기로 처리함
    if(representTool.length >= 10) {
        for(let k = 0; k < 10; k++) {
            if(k < 9) {
                btn1DataActions.push({"type": "uri", "label": representTool[k].productType, "uri": "http://192.168.160.186:9000/admin/tool/uselist?selecttool=" + representTool[k].productType});
            }else if(k == 9) {
                btn1DataActions.push({"type": "uri", "label": "더보기", "uri": "http://192.168.160.186:9000/bot/menu?selectMenu=tool"});
            }
        }
    }else {
        for(let k = 0; k < representTool.length; k++) {
            btn1DataActions.push({"type": "uri", "label": representTool[k].productType, "uri": "http://192.168.160.186:9000/admin/tool/uselist?selecttool=" + representTool[k].productType});
        }
    }
    let btn2DataActions = [];
    // 대표도서가 10개 이상 설정되어 있는 경우 9개까지만 보여지며 마지막은 더보기로 처리함
    if(representBook.length >= 10) {
        for(let k = 0; k < 10; k++) {
            if(k < 9) {
                btn2DataActions.push({"type": "uri", "label": representBook[k].bookType, "uri": "http://192.168.160.186:9000/admin/book/uselist?selectbook=" + representBook[k].bookType});
            }else if(k == 9) {
                btn2DataActions.push({"type": "uri", "label": "더보기", "uri": "http://192.168.160.186:9000/bot/menu?selectMenu=book"});
            } 
        }
    }else {
        for(let k = 0; k < representBook.length; k++) {
            btn2DataActions.push({"type": "uri", "label": representBook[k].bookType, "uri": "http://192.168.160.186:9000/admin/book/uselist?selectbook=" + representBook[k].bookType});
        }
    }
    let btnData1 = {
        "content": {
            "type": "button_template",
            "contentText": "어떤 장비 유형을 선택하시겠습니까?",
            "actions": btn1DataActions
        }
    }
    let btnData2 = {
        "content": {
            "type": "button_template",
            "contentText": "어떤 도서 유형을 선택하시겠습니까?",
            "actions": btn2DataActions
        }
    }
   
    if(queryData == "tooluseapply") {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(btnData1)
        }
        request(options, (error, response, body) => {
            console.log('bot error:', error);
            console.log('bot statusCode:', response && response.statusCode);
            if(response.statusCode != 401) {
                res.write("<script>window.location=\"/bot/botclose\"</script>"); 
            }else {
                /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                req.session.destroy(err => {
                    if (err) {
                        console.log(error);
                        return res.status(500).send("<h1>500 error</h1>");
                    }
                    session.mobileYN = "Y";
                    res.write("<script>window.location=\"/admin_logout\"</script>"); 
                });       
            }     
        });
    }else if(queryData == "bookuseapply") {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(btnData2)
        }
        request(options, (error, response, body) => {
            console.log('bot error:', error);
            console.log('bot statusCode:', response && response.statusCode);
            if(response.statusCode != 401) {
                res.write("<script>window.location=\"/bot/botclose\"</script>"); 
            }else {
                /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                req.session.destroy(err => {
                    if (err) {
                        console.log(error);
                        return res.status(500).send("<h1>500 error</h1>");
                    }
                    session.mobileYN = "Y";
                    res.write("<script>window.location=\"/admin_logout\"</script>"); 
                });       
            }     
        });
    }else if(queryData == "toolreturnapply") {
        if(toolList.length > 0) {
            let options = {			 
                url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
                method: 'POST',			 
                headers: {
                    "Authorization": "Bearer " + tokenData,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(menuMessageData2)
            }
            request(options, (error, response, body) => {
                console.log('bot error:', error);
                console.log('bot statusCode:', response && response.statusCode);
                if(response.statusCode != 401) {
                    res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                }else {
                    /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                    req.session.destroy(err => {
                        if (err) {
                            console.log(error);
                            return res.status(500).send("<h1>500 error</h1>");
                        }
                        session.mobileYN = "Y";
                        res.write("<script>window.location=\"/admin_logout\"</script>"); 
                    });       
                }     
            });
        }else {                
            let options = {			 
                url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
                method: 'POST',			 
                headers: {
                    "Authorization": "Bearer " + tokenData,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(menuMessageData3)
            }
            request(options, (error, response, body) => {
                console.log('bot error:', error);
                console.log('bot statusCode:', response && response.statusCode);
                if(response.statusCode != 401) {
                    res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                }else {
                    /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                    req.session.destroy(err => {
                        if (err) {
                            console.log(error);
                            return res.status(500).send("<h1>500 error</h1>");
                        }
                        session.mobileYN = "Y";
                        res.write("<script>window.location=\"/admin_logout\"</script>"); 
                    });       
                }    
            });
        }
    }else if(queryData == "bookreturnapply") {
        if(bookList.length > 0) {
            let options = {			 
                url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
                method: 'POST',			 
                headers: {
                    "Authorization": "Bearer " + tokenData,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(menuMessageData4)
            }
            request(options, (error, response, body) => {
                console.log('bot error:', error);
                console.log('bot statusCode:', response && response.statusCode);
                if(response.statusCode != 401) {
                    res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                }else {
                    /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                    req.session.destroy(err => {
                        if (err) {
                            console.log(error);
                            return res.status(500).send("<h1>500 error</h1>");
                        }
                        /* Express Session에 모바일 접속 여부를 기입한다 */
                        session.mobileYN = "Y";
                        res.write("<script>window.location=\"/admin_logout\"</script>"); 
                    });       
                }   
            });
        }else {
            let options = {			 
                url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
                method: 'POST',			 
                headers: {
                    "Authorization": "Bearer " + tokenData,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(menuMessageData5)
            }
            request(options, (error, response, body) => {
                console.log('bot error:', error);
                console.log('bot statusCode:', response && response.statusCode);
                if(response.statusCode != 401) {
                    res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                }else {
                    /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                    req.session.destroy(err => {
                        if (err) {
                            console.log(error);
                            return res.status(500).send("<h1>500 error</h1>");
                        }
                        /* Express Session에 모바일 접속 여부를 기입한다 */
                        session.mobileYN = "Y";
                        res.write("<script>window.location=\"/admin_logout\"</script>"); 
                    });       
                }      
            });
        }
    }

    if(admin_level == "") {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요합니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// BOT 장비유형 선택 페이지 - BOT 메뉴(시작 -> 장비 사용신청 -> 장비유형 리스트 등록에 사용되는 메뉴)
app.get('/admin/bot/selecttool', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }
    /* db tool 테이블에 등록되어 있는 장비유형을 필터링하여 대표장비 db에 자동 입력 */  
    let toolData = db.get('tool').value();
    let toolfilter = toolData.filter(function(item1, idx) {
        return toolData.findIndex(function(item2, idx) {
            return item1.productType == item2.productType
        }) == idx;
    });

    for(let i = 0; i < toolfilter.length; i++) {
        if(db.get('representTool').find({ productType: toolfilter[i].productType }).value() == null) {
            db.get('representTool').push({
                productType: toolfilter[i].productType,
                representYN: "N"
            }).write();
        }
    }
    let representToolList = db.get('representTool').value();

    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/bot/botselecttool', { representToolList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// BOT 장비유형 - 대표장비 설정
app.post('/bot_represent_tool', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let productType = data[i].productType;
        db.get('representTool').find({productType: productType}).assign({
            representYN: "Y",
        }).write();
    }
});
// BOT 장비유형 - 대표장비 해제
app.post('/bot_cancel_tool', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let productType = data[i].productType;
        db.get('representTool').find({productType: productType}).assign({
            representYN: "N",
        }).write();
    }
});
// BOT 장비유형 - 장비유형 삭제(사용하지 않는 장비유형 직접 삭제. 사용하고 있는 경우 유형에 자동으로 재등록)
app.post('/bot_delete_tool', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let productType = data[i].productType;
        db.get('representTool').remove({productType: productType}).write();
    }
});

// BOT 도서유형 선택 페이지 - BOT 메뉴(시작 -> 도서 대여신청 -> 도서유형 리스트 등록에 사용되는 메뉴)
app.get('/admin/bot/selectbook', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    /* db book 테이블에 등록되어 있는 도서유형을 필터링하여 대표도서 db에 자동 입력 */  
    let bookData = db.get('book').value();
    let bookfilter = bookData.filter(function(item1, idx) {
        return bookData.findIndex(function(item2, idx) {
            return item1.bookType == item2.bookType
        }) == idx;
    });

    for(let i = 0; i < bookfilter.length; i++) {   
        if(db.get('representBook').find({ bookType: bookfilter[i].bookType }).value() == null) {
            db.get('representBook').push({
                bookType: bookfilter[i].bookType,
                representYN: "N"
            }).write();
        }
    }
    let representBookList = db.get('representBook').value();

    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/bot/botselectbook', { representBookList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// BOT 관리자 알림 선택 페이지(사용자가 장비 사용신청, 반납신청, 도서 대여신청, 반납신청하는 경우 알림을 받을 관리자를 선택)
app.get('/admin/bot/selectadmin', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    let membersdb = db.get('members').value();
    let adminList = [];

    for(let i = 0; i < membersdb.length; i++) {
        if(membersdb[i].adminlevel.includes("관리자") != false) {
            adminList.push(membersdb[i]);
        }     
    }

    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/bot/botselectadmin', { adminList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }  
});
// BOT 도서유형 - 대표도서 설정
app.post('/bot_represent_book', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let bookType = data[i].bookType;
        db.get('representBook').find({bookType: bookType}).assign({
            representYN: "Y",
        }).write();
    }
});
// BOT 도서유형 - 대표도서 해제
app.post('/bot_cancel_book', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let bookType = data[i].bookType;
        db.get('representBook').find({bookType: bookType}).assign({
            representYN: "N",
        }).write();
    }
});
// BOT 도서유형 - 도서유형 삭제(사용하지 않는 도서유형 직접 삭제. 사용하고 있는 경우 유형에 자동으로 재등록)
app.post('/bot_delete_book', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let bookType = data[i].bookType;
        db.get('representBook').remove({bookType: bookType}).write();
    }
});
// BOT 알림 관리자 - 알림 관리자 설정
app.post('/bot_select_admin', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let email = data[i].email;
        db.get('members').find({email: email}).assign({
            botAdmin: "Y",
        }).write();
    }
});
// BOT 알림 관리자 - 알림 관리자 해제
app.post('/bot_cancel_admin', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let email = data[i].email;
        db.get('members').find({email: email}).assign({
            botAdmin: "N",
        }).write();
    }
});
/* End BOT Menu */





/* 홈페이지 관리자 장비관리 */
// 장비 목록 페이지
app.get('/admin/tool', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }     
    const toolList = db.get('tool').value();
    const notebookCnt = db.get('tool').filter({ productType: "노트북" }).value().length;
    const monitorCnt = db.get('tool').filter({ productType: "모니터" }).value().length;
    const desktopCnt = db.get('tool').filter({ productType: "PC 본체" }).value().length;
    const adapterCnt = db.get('tool').filter({ productType: "RJ45 이더넷 어댑터" }).value().length;
    const testerCnt = db.get('tool').filter({ productType: "테스트 단말기" }).value().length;
    const hubCnt = db.get('tool').filter({ productType: "USB HUB" }).value().length;
    const usimCnt = db.get('tool').filter({ productType: "USIM" }).value().length;
    const eggCnt = db.get('tool').filter({ productType: "EGG" }).value().length;
    const etcCnt = db.get('tool').filter({ productType: "기타" }).value().length;

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/admintool', { loginMember, pageNum, toolList, notebookCnt, monitorCnt, desktopCnt, adapterCnt, testerCnt, hubCnt, usimCnt, eggCnt, etcCnt } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }  
});
// 장비 검색 -> 검색목록 페이지
app.get('/admin/tool/search', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }
    let searchSelect = req.session.toolsearch1;
    let searchColumn = req.session.toolsearch2;
    let tooldb = db.get('tool').value();
    let toolList = [];

    for(let i = 0; i < tooldb.length; i++) {
        if(searchSelect == "productType") {
            if(tooldb[i].productType.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }          
        }else if(searchSelect == "managementNumber") {
            if(tooldb[i].managementNumber.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "productName") {
            if(tooldb[i].productName.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "useYN") {
            if(tooldb[i].useYN.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "user") {
            if(tooldb[i].user.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "useStartDate") {
            if(tooldb[i].useStartDate.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "useEndDate") {
            if(tooldb[i].useEndDate.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }
    }

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/adminsearchtool', { toolList, pageNum, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 장비 사용신청 페이지
app.get('/admin/tool/use_apply', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    const toolList = db.get('tool').value();
    const codeList = db.get('commonCode').value();
    let useNumber = "";

    if(req.query.managementNumber != undefined || req.query.managementNumber != null) {
        useNumber = db.get('tool').find({ managementNumber: req.query.managementNumber }).value();
    }
    
    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        if(useNumber != undefined || useNumber != null) {
            res.render('admin/tool/tooluseapply', { loginMember, toolList, codeList, useNumber } );
        }else {
            useNumber = "";
            res.render('admin/tool/tooluseapply', { loginMember, toolList, codeList, useNumber } );
        }  
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 장비 반납신청 페이지
app.get('/admin/tool/return_apply', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    const toolList = db.get('tool').value();
    const codeList = db.get('commonCode').value();
    let useNumber = "";

    if(req.query.managementNumber != undefined || req.query.managementNumber != null) {
        useNumber = db.get('tool').find({ managementNumber: req.query.managementNumber }).value();
    } 
    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        if(useNumber != undefined || useNumber != null) {
            res.render('admin/tool/toolreturnapply', { loginMember, toolList, codeList, useNumber } );
        }else {
            useNumber = "";
            res.render('admin/tool/toolreturnapply', { loginMember, toolList, codeList, useNumber } );
        }        
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 장비 대여확인 페이지
app.get('/admin/tool/use_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }   
    const toolList = db.get('tool').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/toolusecheck', { toolList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 장비 반납확인 페이지
app.get('/admin/tool/return_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }   
    const toolList = db.get('tool').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/toolreturncheck', { toolList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 장비 추가 페이지
app.get('/admin/tool/add', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }
    const codeList = db.get('commonCode').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/tooladd', { codeList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 장비 상세정보 페이지
app.get('/admin/tool/detail', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }   
    const managementNumber = req.query.managementNumber;
    const toolOne = db.get('tool').find({ managementNumber: managementNumber }).value();

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/tooldetail', { loginMember, toolOne } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 장비 정보수정 페이지
app.get('/admin/tool/modify', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }   
    const managementNumber = req.query.managementNumber;
    const toolOne = db.get('tool').find({ managementNumber: managementNumber }).value();
    const codeList = db.get('commonCode').value();

    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/toolmodify', { loginMember, toolOne, codeList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 장비 - 검색
app.post('/admin/tool', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }
    
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }
    let body = req.body;
    let searchSelect = body.searchSelect;
    let searchColumn = body.searchColumn;
    let tooldb = db.get('tool').value();
    let toolList = [];

    for(let i = 0; i < tooldb.length; i++) {
        if(searchSelect == "productType") {
            if(tooldb[i].productType.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }          
        }else if(searchSelect == "managementNumber") {
            if(tooldb[i].managementNumber.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "productName") {
            if(tooldb[i].productName.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "useYN") {
            if(tooldb[i].useYN.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "user") {
            if(tooldb[i].user.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "useStartDate") {
            if(tooldb[i].useStartDate.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }else if(searchSelect == "useEndDate") {
            if(tooldb[i].useEndDate.includes(searchColumn) != false) {
                toolList.push(tooldb[i]);
            }  
        }
    }

    req.session.toolsearch1 = searchSelect;
    req.session.toolsearch2 = searchColumn;
    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/tool/adminsearchtool', { loginMember, pageNum, toolList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }   
});
// 장비 - 등록
app.post('/tool_create', uploader.single('imagefile'), (req, res) => {
    if(db.get('tool').find({managementNumber: req.body.managementNumber}).value() != null) {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('이미 등록된 관리번호가 존재합니다.');</script>");
        res.write("<script>window.location=\"/admin/tool/add\"</script>");
    }else {
        let body = req.body;
        let productType = body.productType;
        let managementNumber = body.managementNumber;
        let maker = body.maker;
        let telecom = body.telecom;
        let productName = body.productName;
        let inch = body.inch;
        let cpu = body.cpu;
        let memory = body.memory;
        let windowYN = body.windowYN;
        let connectionType = body.connectionType;
        let lanYN = body.lanYN;
        let productSerial = body.productSerial;
        let udid = body.udid;
        let osVersion = body.osVersion;
        let phoneNumber = body.phoneNumber;
        let callingPlan = body.callingPlan
        let purchaseDate = body.purchaseDate;
        let useYN = "";
        let user = body.user;
        let useStartDate = "";
        let useEndDate = "";
        let usePlace = body.usePlace;
        let returnYN = "";
        let returnDate = "";
        let reference = body.reference;
        let base64EncodeImg = "";
        let toolHistory = [];
        let writer = body.writer;
        let date = body.date;
    
        if(user != "") {
            useYN = "Y";
        }else {
            useYN = "N";
        }
        if(req.file != null) {
            let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
            base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');
        }  
    
        // lowdb 이용해서 글 생성 (db.json의 topics에 위치하게 됨) 
        db.get('tool').push({
            productType: productType,
            managementNumber: managementNumber,
            maker: maker,
            telecom: telecom,
            productName: productName,
            inch: inch,
            cpu: cpu,
            memory: memory,
            windowYN: windowYN,
            connectionType: connectionType,
            lanYN: lanYN,
            productSerial: productSerial,
            udid: udid,
            osVersion: osVersion,
            phoneNumber: phoneNumber,
            callingPlan: callingPlan,
            purchaseDate: purchaseDate,
            useYN: useYN,
            user: user,
            useStartDate: useStartDate,
            useEndDate: useEndDate,
            usePlace: usePlace,
            returnYN: returnYN,
            returnDate: returnDate,
            imagename: base64EncodeImg,
            reference: reference,
            toolHistory: toolHistory,
            writer: writer,
            date: date,
            modifier: "",
            modifydate: ""
        }).write();
        res.redirect('/admin/tool');
    }
});
// 장비 - 수정
app.post('/tool_update', uploader.single('imagefile'), function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let maker = body.maker;
    let telecom = body.telecom;
    let productName = body.productName;
    let inch = body.inch;
    let cpu = body.cpu;
    let memory = body.memory;
    let windowYN = body.windowYN;
    let connectionType = body.connectionType;
    let lanYN = body.lanYN;
    let productSerial = body.productSerial;
    let udid = body.udid;
    let osVersion = body.osVersion;
    let phoneNumber = body.phoneNumber;
    let callingPlan = body.callingPlan
    let purchaseDate = body.purchaseDate;
    let useYN = "";
    let user = body.user;
    let usePlace = body.usePlace;
    let reference = body.reference;
    let modifier = body.modifier;
    let modifydate = body.modifydate; 

    let base64EncodeImg = "";
    if(user != "") {
        useYN = "Y";
    }else {
        useYN = "N";
    }
    if(req.file != null) {
        let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
        base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');
        let deleteInfo = db.get('tool').find({managementNumber: managementNumber}).value();
        if(deleteInfo.imagename != "") {
            fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 기존 이미지 파일 삭제
        }
    }else {
        let oldfile = db.get('tool').find({ managementNumber: managementNumber }).value();
        base64EncodeImg = oldfile.imagename;
    }  
  
    // lowdb이용해서 글 수정 (db.json에서 일치하는 글 찾아서 수행)
    db.get('tool').find({managementNumber: managementNumber}).assign({
        maker: maker,
        telecom: telecom,
        productName: productName,
        inch: inch,
        cpu: cpu,
        memory: memory,
        windowYN: windowYN,
        connectionType: connectionType,
        lanYN: lanYN,
        productSerial: productSerial,
        udid: udid,
        osVersion: osVersion,
        phoneNumber: phoneNumber,
        callingPlan: callingPlan,
        purchaseDate: purchaseDate,
        useYN: useYN,
        user: user,
        usePlace: usePlace,
        imagename: base64EncodeImg,
        reference: reference,
        modifier: modifier,
        modifydate: modifydate
    }).write();
    res.redirect('/admin/tool');
});
// 장비 - 삭제
app.get('/admin/tool/delete', (req, res) => {
    let managementNumber = req.query.managementNumber; // 게시글 시리얼 확인 
    let deleteInfo = db.get('tool').find({managementNumber: managementNumber}).value(); // 게시글 시리얼을 통해 이미지 파일 조회

    // lowdb이용해서 글 식제 (db.json에서 일치하는 글 찾아서 수행)
    db.get('tool').remove({managementNumber: managementNumber}).write(); // db 정보 삭제
    if(deleteInfo.imagename != "") {
        fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 이미지 파일 삭제
    }
    res.redirect('/admin/tool');
});
// 장비 - 사용신청
app.post('/tool_use_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let useYN = body.useYN;
    let user = body.user;
    let useStartDate = body.useStartDate;
    let useEndDate = body.useEndDate;
    let usePlace = body.usePlace;

    db.get('tool').find({managementNumber: managementNumber}).assign({
        useYN: useYN,
        user: user,
        useStartDate: useStartDate,
        useEndDate: useEndDate,
        usePlace: usePlace
    }).write();
    res.redirect('/admin/tool');
});
// 장비 - 반납신청
app.post('/tool_return_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let user = body.user;
    let returnYN = body.returnYN;
    let returnDate = body.returnDate;

    db.get('tool').find({managementNumber: managementNumber}).assign({
        user: user,
        returnYN: returnYN,
        returnDate: returnDate
    }).write();
    res.redirect('/admin/tool');
});
// 장비 - 사용신청 -> 승인
app.post('/tool_use_approval', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        db.get('tool').find({managementNumber: managementNumber}).assign({
            useYN: "Y"
        }).write();
    }
});
// 장비 - 사용신청 -> 반려
app.post('/tool_use_refuse', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        db.get('tool').find({managementNumber: managementNumber}).assign({
            useYN: "N",
            user: "",
            useStartDate: "",
            useEndDate: "",
            usePlace: ""
        }).write();
    }
});
// 장비 - 반납신청 -> 승인
app.post('/tool_return_approval', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        let toolOne = db.get('tool').find({ managementNumber: managementNumber }).value();
        let toolHistory = toolOne.toolHistory;
        toolHistory.push('사용자: ' + toolOne.user + ' / 사용기간: ' + toolOne.useStartDate + ' ~ ' + toolOne.returnDate);

        db.get('tool').find({managementNumber: managementNumber}).assign({
            useYN: "N",
            user: "",
            useStartDate: "",
            useEndDate: "",
            usePlace: "",
            returnYN: "Y",
            returnDate: "",
            toolHistory: toolHistory
        }).write();
    }
});
// 장비 - 반납신청 -> 반려
app.post('/tool_return_refuse', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        db.get('tool').find({managementNumber: managementNumber}).assign({
            returnYN: "",
            returnDate: ""
        }).write();
    }
});
// 장비 - 엑셀 업로드
app.post('/tool_excel_upload', function(req, res) {
    let data = req.body;
    let today = new Date();
    let year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2);
    var date = ('0' + today.getDate()).slice(-2);
    let today_date = year + '-' + month + '-' + date;

    for(let i = 0; i < data.length; i++) {
        let productType = data[i].유형;
        if(productType == undefined) {
            productType = "";
        }
        let managementNumber = data[i].관리번호;
        let maker = data[i].제조사;
        if(maker == undefined) {
            maker = "";
        }
        let telecom = data[i].통신사;
        if(telecom == undefined) {
            telecom = "";
        }
        let productName = data[i].제품명;
        if(productName == undefined) {
            productName = "";
        }
        let inch = data[i].화면크기;
        if(inch == undefined) {
            inch = "";
        }
        let cpu = data[i].cpu;
        if(cpu == undefined) {
            cpu = "";
        }
        let memory = data[i].메모리;
        if(memory == undefined) {
            memory = "";
        }
        let windowYN = data[i].윈도우유무;
        if(windowYN == undefined) {
            windowYN = "";
        }
        let connectionType = data[i].연결타입;
        if(connectionType == undefined) {
            connectionType = "";
        }
        let lanYN = data[i].LAN지원유무;
        if(lanYN == undefined) {
            lanYN = "";
        }
        let productSerial = data[i].시리얼;
        if(productSerial == undefined) {
            productSerial = "";
        }
        let udid = data[i].udid;
        if(udid == undefined) {
            udid = "";
        }
        let osVersion = data[i].osversion;
        if(osVersion == undefined) {
            osVersion = "";
        }
        let phoneNumber = data[i].개통번호;
        if(phoneNumber == undefined) {
            phoneNumber = "";
        }
        let callingPlan = data[i].요금제및데이터
        if(callingPlan == undefined) {
            callingPlan = "";
        }
        let purchaseDate = data[i].구매일;
        if(purchaseDate == undefined) {
            purchaseDate = "";
        }
        let useYN = "N";
        let user = data[i].사용자;
        if(user == undefined) {
            user = "";
        }
        let useStartDate = "";
        let useEndDate = "";
        let usePlace = data[i].사용처;
        if(usePlace == undefined) {
            usePlace = "";
        }
        let returnYN = "";
        let returnDate = "";
        let reference = data[i].비고;
        if(reference == undefined) {
            reference = "";
        }
        let base64EncodeImg = "";
        let toolHistory = [];
        let writer = req.session.user.name;
        let date = today_date;

        if(db.get('tool').find({managementNumber: managementNumber}).value() != null) {
            break;
        }else {
            db.get('tool').push({
                productType: productType,
                managementNumber: managementNumber,
                maker: maker,
                telecom: telecom,
                productName: productName,
                inch: inch,
                cpu: cpu,
                memory: memory,
                windowYN: windowYN,
                connectionType: connectionType,
                lanYN: lanYN,
                productSerial: productSerial,
                udid: udid,
                osVersion: osVersion,
                phoneNumber: phoneNumber,
                callingPlan: callingPlan,
                purchaseDate: purchaseDate,
                useYN: useYN,
                user: user,
                useStartDate: useStartDate,
                useEndDate: useEndDate,
                usePlace: usePlace,
                returnYN: returnYN,
                returnDate: returnDate,
                imagename: base64EncodeImg,
                reference: reference,
                toolHistory: toolHistory,
                writer: writer,
                date: date,
                modifier: "",
                modifydate: ""
            }).write();
        }     
    }
});

/* 모바일 전용 화면 */
// 모바일 장비 전체 목록 리스트
app.get('/admin/tool/alllist', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }     
    const toolList = db.get('tool').value();
    const codeList = db.get('commonCode').value();

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/toolmobilelist', { loginMember, pageNum, toolList, codeList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }  
});
// 모바일 사용신청 가능한 장비 리스트 페이지
app.get('/admin/tool/uselist', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let selecttool = "";
    if(req.query.selecttool != undefined || req.query.selecttool != null) {
        selecttool = req.query.selecttool;
    }
    let toolList = [];
    let toolData = db.get('tool').filter({ useYN: "N" }).value();
    for(let i = 0; i < toolData.length; i++) {
        if(toolData[i].productType.includes(selecttool) != false) {
            toolList.push(toolData[i]);
        }
    }
    const codeList = db.get('commonCode').value();
    
    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/tooluselist', { toolList, selecttool, loginMember, codeList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 모바일 반납신청 해야 할 장비 리스트 페이지
app.get('/admin/tool/returnlist', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    if(admin_level != "") {
        let toolList = [];
        let toolData = db.get('tool').filter({ useYN: "Y" }).value();
        for(let i = 0; i < toolData.length; i++) {
            if(toolData[i].user == req.session.user.name) {
                toolList.push(toolData[i]);
            }
        }
        const codeList = db.get('commonCode').value();
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/toolreturnlist', { toolList, loginMember, codeList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 모바일 장비 대여확인 페이지
app.get('/admin/tool/mobile_use_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }   
    const toolList = db.get('tool').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/toolmobileusecheck', { toolList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 모바일 장비 반납확인 페이지
app.get('/admin/tool/mobile_return_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }   
    const toolList = db.get('tool').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/toolmobilereturncheck', { toolList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 모바일 장비 - 사용신청
app.post('/tool_mobile_use_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let useYN = body.useYN;
    let user = body.user;
    let useStartDate = body.useStartDate;
    let useEndDate = body.useEndDate;
    let usePlace = body.usePlace;

    db.get('tool').find({managementNumber: managementNumber}).assign({
        useYN: useYN,
        user: user,
        useStartDate: useStartDate,
        useEndDate: useEndDate,
        usePlace: usePlace
    }).write();

    let userId = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            userId = req.session.user.userId;
        }  
    } 

    // 함수를 순차적으로 실행하기 위한 Promise 설정
    let first = new Promise(function(resolve, reject) {
        resolve();
        reject();
    });

    first.then(() => {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(messageData1)
        }
        request(options, (error, response, body) => {
            console.log('bot error:', error);
            console.log('bot statusCode:', response && response.statusCode);
        });
    }).then(() => {
        let botAdminList = db.get('members').filter({ botAdmin: "Y" }).value();
        if(botAdminList != null || botAdminList != undefined) {
            for(let i = 0; i < botAdminList.length; i++) {
                // 관리자 알림 부분
                let options = {			 
                    url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ botAdminList[i].userId +'/messages',
                    method: 'POST',			 
                    headers: {
                        "Authorization": "Bearer " + tokenData,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(messageData5)
                }
                request(options, (error, response, body) => {
                    if(response.statusCode != 401) {
                        res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                    }else {
                        /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                        req.session.destroy(err => {
                            if (err) {
                                console.log(error);
                                return res.status(500).send("<h1>500 error</h1>");
                            }
                            /* Express Session에 모바일 접속 여부를 기입한다 */
                            session.mobileYN = "Y";
                            res.write("<script>window.location=\"/admin_logout\"</script>"); 
                        });       
                    }   
                });
            }
        }
    }).catch(() => {
        console.log('bot call error!');
    });
});
// 모바일 장비 - 반납신청
app.post('/tool_mobile_return_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let user = body.user;
    let returnYN = body.returnYN;
    let returnDate = body.returnDate;

    db.get('tool').find({managementNumber: managementNumber}).assign({
        user: user,
        returnYN: returnYN,
        returnDate: returnDate
    }).write();

    let userId = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            userId = req.session.user.userId;
        }  
    } 

    // 함수를 순차적으로 실행하기 위한 Promise 설정
    let first = new Promise(function(resolve, reject) {
        resolve();
        reject();
    });

    first.then(() => {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(messageData2)
        }
        request(options, (error, response, body) => {
            console.log('bot error:', error);
            console.log('bot statusCode:', response && response.statusCode);
        });
    }).then(() => {
        let botAdminList = db.get('members').filter({ botAdmin: "Y" }).value();
        if(botAdminList != null || botAdminList != undefined) {
            for(let i = 0; i < botAdminList.length; i++) {
                // 관리자 알림 부분
                let options = {			 
                    url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ botAdminList[i].userId +'/messages',
                    method: 'POST',			 
                    headers: {
                        "Authorization": "Bearer " + tokenData,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(messageData7)
                }
                request(options, (error, response, body) => {
                    if(response.statusCode != 401) {
                        res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                    }else {
                        /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                        req.session.destroy(err => {
                            if (err) {
                                console.log(error);
                                return res.status(500).send("<h1>500 error</h1>");
                            }
                            /* Express Session에 모바일 접속 여부를 기입한다 */
                            session.mobileYN = "Y";
                            res.write("<script>window.location=\"/admin_logout\"</script>"); 
                        });       
                    }   
                });
            }
        }
    }).catch(() => {
        console.log('bot call error!');
    });
});
/* End Tool Menu */





/* 홈페이지 관리자 도서관리 */
// 도서 목록 페이지
app.get('/admin/book', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }     
    const bookList = db.get('book').value();

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/adminbook', { loginMember, pageNum, bookList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }  
});
// 도서 검색 -> 검색목록 페이지
app.get('/admin/book/search', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }
    let searchSelect = req.session.booksearch1;
    let searchColumn = req.session.booksearch2;
    let bookList = db.get('book').value();
    let filterBookList = [];

    for(let i = 0; i < bookList.length; i++) {
        if(searchSelect == "bookType") {
            if(bookList[i].bookType.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }          
        }else if(searchSelect == "managementNumber") {
            if(bookList[i].managementNumber.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "bookName") {
            if(bookList[i].bookName.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "useYN") {
            if(bookList[i].useYN.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "user") {
            if(bookList[i].user.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "useStartDate") {
            if(bookList[i].useStartDate.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "useEndDate") {
            if(bookList[i].useEndDate.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }
    }

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/adminsearchbook', { filterBookList, pageNum, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 도서 대여신청 페이지
app.get('/admin/book/use_apply', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }
    }
    const bookList = db.get('book').value();
    const codeList = db.get('commonCode').value();
    let useNumber = "";

    if(req.query.managementNumber != undefined || req.query.managementNumber != null) {
        useNumber = db.get('book').find({ managementNumber: req.query.managementNumber }).value();
    }
    
    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        if(useNumber != undefined || useNumber != null) {
            res.render('admin/book/bookuseapply', { loginMember, bookList, codeList, useNumber } );
        }else {
            useNumber = "";
            res.render('admin/book/bookuseapply', { loginMember, bookList, codeList, useNumber } );
        }
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 도서 반납신청 페이지
app.get('/admin/book/return_apply', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }
    }  
    const bookList = db.get('book').value();
    const codeList = db.get('commonCode').value();
    let useNumber = "";

    if(req.query.managementNumber != undefined || req.query.managementNumber != null) {
        useNumber = db.get('book').find({ managementNumber: req.query.managementNumber }).value();
    } 
    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        if(useNumber != undefined || useNumber != null) {
            res.render('admin/book/bookreturnapply', { loginMember, bookList, codeList, useNumber } );
        }else {
            useNumber = "";
            res.render('admin/book/bookreturnapply', { loginMember, bookList, codeList, useNumber } );
        }
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 도서 대여확인 페이지
app.get('/admin/book/use_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }    
    const bookList = db.get('book').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/bookusecheck', { bookList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 도서 반납확인 페이지
app.get('/admin/book/return_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }    
    const bookList = db.get('book').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/bookreturncheck', { bookList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 도서 추가 페이지
app.get('/admin/book/add', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }   
    const codeList = db.get('commonCode').value();

    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/bookadd', { loginMember, codeList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 도서 상세정보 페이지
app.get('/admin/book/detail', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }    
    const managementNumber = req.query.managementNumber;
    const bookOne = db.get('book').find({ managementNumber: managementNumber }).value();

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/bookdetail', { loginMember, bookOne } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 도서 정보수정 페이지
app.get('/admin/book/modify', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }
    const managementNumber = req.query.managementNumber;
    const bookOne = db.get('book').find({ managementNumber: managementNumber }).value();
    const codeList = db.get('commonCode').value();

    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/bookmodify', { loginMember, bookOne, codeList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 도서 - 검색
app.post('/admin/book', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }  
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }
    let body = req.body;
    let searchSelect = body.searchSelect;
    let searchColumn = body.searchColumn;
    let bookList = db.get('book').value();
    let filterBookList = [];

    for(let i = 0; i < bookList.length; i++) {
        if(searchSelect == "bookType") {
            if(bookList[i].bookType.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }          
        }else if(searchSelect == "managementNumber") {
            if(bookList[i].managementNumber.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "bookName") {
            if(bookList[i].bookName.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "useYN") {
            if(bookList[i].useYN.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "user") {
            if(bookList[i].user.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "useStartDate") {
            if(bookList[i].useStartDate.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }else if(searchSelect == "useEndDate") {
            if(bookList[i].useEndDate.includes(searchColumn) != false) {
                filterBookList.push(bookList[i]);
            }  
        }
    }

    req.session.booksearch1 = searchSelect;
    req.session.booksearch2 = searchColumn;
    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/book/adminsearchbook', { loginMember, pageNum, filterBookList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }   
});
// 도서 - 등록
app.post('/book_create', uploader.single('imagefile'), (req, res) => {
    if(db.get('book').find({managementNumber: req.body.managementNumber}).value() != null) {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('이미 등록된 관리번호가 존재합니다.');</script>");
        res.write("<script>window.location=\"/admin/book/add\"</script>");
    }else {
        let body = req.body;
        let bookType = body.bookType;
        let managementNumber = body.managementNumber;
        let bookName = body.bookName;
        let purchaseDate = body.purchaseDate;
        let revisionYear = body.revisionYear;
        let useYN = "N";
        let user = "";
        let useStartDate = "";
        let useEndDate = "";
        let returnYN = "";
        let returnDate = "";
        let link = body.link;
        let reference = body.reference;   
        let base64EncodeImg = "";
        let bookHistory = [];
        let writer = body.writer;
        let date = body.date;

        if(req.file != null) {
            let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
            base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');
        }  
    
        // lowdb 이용해서 글 생성 (db.json의 topics에 위치하게 됨) 
        db.get('book').push({
            bookType: bookType,
            managementNumber: managementNumber,
            bookName: bookName,
            purchaseDate: purchaseDate,
            revisionYear: revisionYear,
            useYN: useYN,
            user: user,
            useStartDate: useStartDate,
            useEndDate: useEndDate,
            returnYN: returnYN,
            returnDate: returnDate,
            link: link,
            imagename: base64EncodeImg,
            reference: reference,
            bookHistory: bookHistory,
            writer: writer,
            date: date,
            modifier: "",
            modifydate: ""
        }).write();
        res.redirect('/admin/book');        
    }
});
// 도서 - 수정
app.post('/book_update', uploader.single('imagefile'), function(req, res) {
    let body = req.body;
    let bookType = body.bookType;
    let managementNumber = body.managementNumber;
    let bookName = body.bookName;
    let purchaseDate = body.purchaseDate;
    let revisionYear = body.revisionYear;
    let link = body.link;
    let reference = body.reference;
    let modifier = body.modifier;
    let modifydate = body.modifydate; 

    let base64EncodeImg = "";
    if(req.file != null) {
        let { fieldname, originalname, mimetype, destination, filename, path, size } = req.file;
        base64EncodeImg = Buffer.from(originalname + new Date(), 'utf-8').toString('base64');
        let deleteInfo = db.get('book').find({managementNumber: managementNumber}).value();
        if(deleteInfo.imagename != "") {
            fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 기존 이미지 파일 삭제
        }
    }else {
        let oldfile = db.get('book').find({ managementNumber: managementNumber }).value();
        base64EncodeImg = oldfile.imagename;
    }  
  
    // lowdb 이용해서 글 수정 (db.json에서 일치하는 글 찾아서 수행)
    db.get('book').find({managementNumber: managementNumber}).assign({
        bookType: bookType,
        bookName: bookName,
        purchaseDate: purchaseDate,
        revisionYear: revisionYear,
        link: link,
        imagename: base64EncodeImg,
        reference: reference,
        modifier: modifier,
        modifydate: modifydate
    }).write();
    res.redirect('/admin/book');
});
// 도서 - 삭제
app.get('/admin/book/delete', (req, res) => {
    let managementNumber = req.query.managementNumber; // 게시글 시리얼 확인 
    let deleteInfo = db.get('book').find({managementNumber: managementNumber}).value(); // 게시글 시리얼을 통해 이미지 파일 조회

    // lowdb이용해서 글 식제 (db.json에서 일치하는 글 찾아서 수행)
    db.get('book').remove({managementNumber: managementNumber}).write(); // db 정보 삭제
    if(deleteInfo.imagename != "") {
        fs.unlinkSync("./public/uploads/" + deleteInfo.imagename); // 이미지 파일 삭제
    }
    res.redirect('/admin/book');
});
// 도서 - 대여신청
app.post('/book_use_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let useYN = body.useYN;
    let user = body.user;
    let useStartDate = body.useStartDate;
    let useEndDate = body.useEndDate;

    db.get('book').find({managementNumber: managementNumber}).assign({
        useYN: useYN,
        user: user,
        useStartDate: useStartDate,
        useEndDate: useEndDate
    }).write();
    res.redirect('/admin/book');
});
// 도서 반납신청
app.post('/book_return_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let user = body.user;
    let returnYN = body.returnYN;
    let returnDate = body.returnDate;

    db.get('book').find({managementNumber: managementNumber}).assign({
        user: user,
        returnYN: returnYN,
        returnDate: returnDate
    }).write();
    res.redirect('/admin/book');
});
// 도서 - 대여신청 -> 승인
app.post('/book_use_approval', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        db.get('book').find({managementNumber: managementNumber}).assign({
            useYN: "Y"
        }).write();
    }
});
// 도서 - 대여신청 -> 반려
app.post('/book_use_refuse', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        db.get('book').find({managementNumber: managementNumber}).assign({
            useYN: "N",
            user: "",
            useStartDate: "",
            useEndDate: ""
        }).write();
    }
});
// 도서 - 반납신청 -> 승인
app.post('/book_return_approval', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        let bookOne = db.get('book').find({ managementNumber: managementNumber }).value();
        let bookHistory = bookOne.bookHistory;
        bookHistory.push('대여자: ' + bookOne.user + ' / 대여기간: ' + bookOne.useStartDate + ' ~ ' + bookOne.returnDate);

        db.get('book').find({managementNumber: managementNumber}).assign({
            useYN: "N",
            user: "",
            useStartDate: "",
            useEndDate: "",
            returnYN: "Y",
            returnDate: "",
            bookHistory: bookHistory
        }).write();
    }
});
// 도서 - 반납신청 -> 반려
app.post('/book_return_refuse', function(req, res) {
    let data = req.body;
    for(let i = 0; i < data.length; i++) {
        let managementNumber = data[i].managementNumber;
        db.get('book').find({managementNumber: managementNumber}).assign({
            returnYN: "",
            returnDate: ""
        }).write();
    }
});
// 도서 - 엑셀 업로드
app.post('/book_excel_upload', function(req, res) {
    let data = req.body;
    let today = new Date();
    let year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2);
    var date = ('0' + today.getDate()).slice(-2);
    let today_date = year + '-' + month + '-' + date;

    for(let i = 0; i < data.length; i++) {
        let bookType = data[i].유형;
        if(bookType == undefined) {
            bookType = "";
        }
        let managementNumber = data[i].관리번호;
        if(managementNumber == undefined) {
            managementNumber = "";
        }
        let bookName = data[i].도서명;
        if(bookName == undefined) {
            bookName = "";
        }
        let purchaseDate = data[i].구매일;
        if(purchaseDate == undefined) {
            boopurchaseDatekType = "";
        }
        let revisionYear = String(data[i].개정년도);
        if(revisionYear == undefined) {
            revisionYear = "";
        }
        let useYN = "N";
        let user = "";
        let useStartDate = "";
        let useEndDate = "";
        let returnYN = "";
        let returnDate = "";
        let link = data[i].링크;
        if(link == undefined) {
            link = "";
        }
        let reference = data[i].비고;   
        if(reference == undefined) {
            reference = "";
        }
        let base64EncodeImg = "";
        let bookHistory = [];
        let writer = req.session.user.name;
        let date = today_date;

        if(db.get('book').find({managementNumber: managementNumber}).value() != null) {
            break;
        }else {
            db.get('book').push({
                bookType: bookType,
                managementNumber: managementNumber,
                bookName: bookName,
                purchaseDate: purchaseDate,
                revisionYear: revisionYear,
                useYN: useYN,
                user: user,
                useStartDate: useStartDate,
                useEndDate: useEndDate,
                returnYN: returnYN,
                returnDate: returnDate,
                link: link,
                imagename: base64EncodeImg,
                reference: reference,
                bookHistory: bookHistory,
                writer: writer,
                date: date,
                modifier: "",
                modifydate: ""
            }).write(); 
        }     
    }
});

/* 모바일 전용 화면 */
// 모바일 도서 전체 목록 리스트
app.get('/admin/book/alllist', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let pageNum = "";
    if(req.query.currentPage != undefined || req.query.currentPage != null) {
        pageNum = req.query.currentPage;
    }     
    const bookList = db.get('book').value();

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/bookmobilelist', { loginMember, pageNum, bookList } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }  
});
// 모바일 대여신청 가능한 도서 리스트 페이지
app.get('/admin/book/uselist', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }     
    let selectbook = "";
    if(req.query.selectbook != undefined || req.query.selectbook != null) {
        selectbook = req.query.selectbook;
    }
    let bookList = [];
    let bookData = db.get('book').filter({ useYN: "N" }).value();
    for(let i = 0; i < bookData.length; i++) {
        if(bookData[i].bookType.includes(selectbook) != false) {
            bookList.push(bookData[i]);
        }
    }

    if(admin_level != "") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/bookuselist', { bookList, selectbook, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 모바일 반납신청 해야 할 도서 리스트 페이지
app.get('/admin/book/returnlist', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }
    }
    if(admin_level != "") {
        let bookList = [];
        let bookData = db.get('book').filter({ useYN: "Y" }).value();
        for(let i = 0; i < bookData.length; i++) {
            if(bookData[i].user == req.session.user.name) {
                bookList.push(bookData[i]);
            }
        }
    
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/bookreturnlist', { bookList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('로그인이 필요한 페이지입니다.');</script>");
        res.write("<script>window.location=\"/admin\"</script>");
    }
});
// 모바일 도서 대여확인 페이지
app.get('/admin/book/mobile_use_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }    
    const bookList = db.get('book').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/bookmobileusecheck', { bookList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 모바일 도서 반납확인 페이지
app.get('/admin/book/mobile_return_check', function(req, res) {
    let admin_level = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            admin_level = req.session.user.adminlevel;
        }  
    }    
    const bookList = db.get('book').value();
    
    if(admin_level != "" && admin_level != "사용자") {
        let loginMember = db.get('members').find({ email: req.session.user.email }).value();
        res.render('admin/mobile/bookmobilereturncheck', { bookList, loginMember } );
    }else {
        res.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
        res.write("<script>alert('접근 권한이 없습니다.');</script>");
        res.write("<script>window.location=\"/admin/main\"</script>");
    }
});
// 모바일 도서 - 대여신청
app.post('/book_mobile_use_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let useYN = body.useYN;
    let user = body.user;
    let useStartDate = body.useStartDate;
    let useEndDate = body.useEndDate;

    db.get('book').find({managementNumber: managementNumber}).assign({
        useYN: useYN,
        user: user,
        useStartDate: useStartDate,
        useEndDate: useEndDate
    }).write();

    let userId = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            userId = req.session.user.userId;
        }  
    } 

    // 함수를 순차적으로 실행하기 위한 Promise 설정
    let first = new Promise(function(resolve, reject) {
        resolve();
        reject();
    });

    first.then(() => {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(messageData3)
        }
        request(options, (error, response, body) => {
            console.log('bot error:', error);
            console.log('bot statusCode:', response && response.statusCode);
        });
    }).then(() => {
        let botAdminList = db.get('members').filter({ botAdmin: "Y" }).value();
        if(botAdminList != null || botAdminList != undefined) {
            for(let i = 0; i < botAdminList.length; i++) {
                // 관리자 알림 부분
                let options = {			 
                    url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ botAdminList[i].userId +'/messages',
                    method: 'POST',			 
                    headers: {
                        "Authorization": "Bearer " + tokenData,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(messageData6)
                }
                request(options, (error, response, body) => {
                    if(response.statusCode != 401) {
                        res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                    }else {
                        /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                        req.session.destroy(err => {
                            if (err) {
                                console.log(error);
                                return res.status(500).send("<h1>500 error</h1>");
                            }
                            /* Express Session에 모바일 접속 여부를 기입한다 */
                            session.mobileYN = "Y";
                            res.write("<script>window.location=\"/admin_logout\"</script>"); 
                        });       
                    }   
                });
            }
        }
    }).catch(() => {
        console.log('bot call error!');
    }); 
});
// 모바일 도서 - 반납신청
app.post('/book_mobile_return_apply', function(req, res) {
    let body = req.body;
    let managementNumber = body.managementNumber;
    let user = body.user;
    let returnYN = body.returnYN;
    let returnDate = body.returnDate;

    db.get('book').find({managementNumber: managementNumber}).assign({
        user: user,
        returnYN: returnYN,
        returnDate: returnDate
    }).write();

    let userId = "";
    if(req.session.user != null) {
        if(req.session.user.email != null) {
            userId = req.session.user.userId;
        }  
    } 

    // 함수를 순차적으로 실행하기 위한 Promise 설정
    let first = new Promise(function(resolve, reject) {
        resolve();
        reject();
    });

    first.then(() => {
        let options = {			 
            url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ userId +'/messages',
            method: 'POST',			 
            headers: {
                "Authorization": "Bearer " + tokenData,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(messageData4)
        }
        request(options, (error, response, body) => {
            console.log('bot error:', error);
            console.log('bot statusCode:', response && response.statusCode);
        });
    }).then(() => {
        let botAdminList = db.get('members').filter({ botAdmin: "Y" }).value();
        if(botAdminList != null || botAdminList != undefined) {
            for(let i = 0; i < botAdminList.length; i++) {
                // 관리자 알림 부분
                let options = {			 
                    url: 'https://www.worksapis.com/v1.0/bots/3835292/users/'+ botAdminList[i].userId +'/messages',
                    method: 'POST',			 
                    headers: {
                        "Authorization": "Bearer " + tokenData,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(messageData8)
                }
                request(options, (error, response, body) => {
                    if(response.statusCode != 401) {
                        res.write("<script>window.location=\"/bot/botclose\"</script>"); 
                    }else {
                        /* 올바른 토큰이 아니기 때문에 세션 삭제 및 로그아웃으로 이동 */   
                        req.session.destroy(err => {
                            if (err) {
                                console.log(error);
                                return res.status(500).send("<h1>500 error</h1>");
                            }
                            /* Express Session에 모바일 접속 여부를 기입한다 */
                            session.mobileYN = "Y";
                            res.write("<script>window.location=\"/admin_logout\"</script>"); 
                        });       
                    }   
                });
            }
        }
    }).catch(() => {
        console.log('bot call error!');
    });
});
/* End Book Menu */





/* 이미지 에디터 편집기 */
// 이미지 에디터 편집화면
app.get('/admin/imageeditor', function(req, res) {
    res.render('admin/imageeditor/imageeditor');
});
/* End Image Editor */