// 오늘의 날씨 플래터
function todayDate() {
    var today = new Date();
    var year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2);
    var day = ('0' + today.getDate()).slice(-2);
    var dateString = year + '-' + month  + '-' + day;

    return dateString;
}

// 날짜 플래터(YYYY-MM-DD)
function dayformat(day) {
    var formatday = '';
    if(day.length == 8) {
        formatday = day.substr(0, 4) + '-' + day.substr(4, 2) + '-' + day.substr(6, 2);
    }else {
        formatday = '';
    }
    return formatday;
}

// 핸드폰 번호 플래터(XXX-XXXX-XXXX)
function phoneFormatter(num, type) {
    var formatNum = '';
    try{
        if (num.length == 11) {
            if (type == 0) {
                formatNum = num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
            } else {
                formatNum = num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
            }
        } else if (num.length == 8) {
            formatNum = num.replace(/(\d{4})(\d{4})/, '$1-$2');
        } else {
            if (num.indexOf('02') == 0) {
                if (type == 0) {
                    formatNum = num.replace(/(\d{2})(\d{4})(\d{4})/, '$1-****-$3');
                } else {
                    formatNum = num.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
                }
            } else {
                if (type == 0) {
                    formatNum = num.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
                } else {
                    formatNum = num.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                }
            }
        }
    } catch(e) {
        formatNum = num;
        console.log(e);
    }
    return formatNum;
}

// 년도-월 플래터(YYYY.MM)
function monthformat(month) {
    var formatmonth = '';
    if(month.length == 6) {
        var checkmonth = month.substr(4, 2);
        if(checkmonth > 13) {
            alert("월 형식을 맞게 입력해주십시오.");
            formatmonth = '';
        }else {
            formatmonth = month.substr(0, 4) + '.' + month.substr(4, 2);
        }       
    }
    return formatmonth;
}

// 장비 관리번호 플래터(A-XXXX, AA-XXXX, A-XXXX-XXX)
function manageformat(managementNumber) {
    var formatnumber = '';
    if(managementNumber.length == 5) {
        formatnumber = managementNumber.substr(0, 1) + '-' + managementNumber.substr(1, 4);
    }else if(managementNumber.length == 6) {
        formatnumber = managementNumber.substr(0, 2) + '-' + managementNumber.substr(2, 4);
    }else if(managementNumber.length == 8) {
        formatnumber = managementNumber.substr(0, 1) + '-' + managementNumber.substr(1, 4) + '-' + managementNumber.substr(5, 3);
    }else {
        alert("관리번호 형식을 맞게 입력해주십시오.");
        formatnumber = '';
    }
    return formatnumber;
}

// 도서 관리번호 플래터(B-XXXX)
function bookformat(managementNumber) {
    var formatnumber = '';
    if(managementNumber.length == 5) {
        formatnumber = managementNumber.substr(0, 1) + '-' + managementNumber.substr(1, 4);
    }else {
        alert("관리번호 형식을 맞게 입력해주십시오.");
        formatnumber = '';
    }
    return formatnumber;
}

// 날짜 비교 함수
function getDateDiff(day1, day2) {
    var date1 = new Date(day1);
    var date2 = new Date(day2);
    var diffDate = date1.getTime() - date2.getTime();
    
    return (diffDate / (1000 * 60 * 60 * 24)); // 밀리세컨 * 초 * 분 * 시 = 일
}

// 엑셀 다운로드 함수
function _excelDown(fileName, sheetName, table) {
    var html = '';
    html += '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
    html += '    <head>';
    html += '        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">';
    html += '        <xml>';
    html += '            <x:ExcelWorkbook>';
    html += '                <x:ExcelWorksheets>';
    html += '                    <x:ExcelWorksheet>'
    html += '                        <x:Name>' + sheetName + '</x:Name>';   // 시트이름
    html += '                        <x:WorksheetOptions><x:Panes></x:Panes></x:WorksheetOptions>';
    html += '                    </x:ExcelWorksheet>';
    html += '                </x:ExcelWorksheets>';
    html += '            </x:ExcelWorkbook>';
    html += '        </xml>';
    html += '    </head>';
    html += '    <body>';
    
    // ----------------- 시트 내용 부분 -----------------
    html += table;
    // ----------------- // 시트 내용 부분 -----------------
    
    html += '    </body>';
    html += '</html>';
    
    // 데이터 타입
    var data_type = 'data:application/vnd.ms-excel';
    var ua = window.navigator.userAgent;
    var blob = new Blob([html], {type: "application/csv;charset=utf-8;"});
    
    if ((ua.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) && window.navigator.msSaveBlob) {
        // ie이고 msSaveBlob 기능을 지원하는 경우
        navigator.msSaveBlob(blob, fileName);
    } else {
        // ie가 아닌 경우 (바로 다운이 되지 않기 때문에 클릭 버튼을 만들어 클릭을 임의로 수행하도록 처리)
        var anchor = window.document.createElement('a');
        anchor.href = window.URL.createObjectURL(blob);
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        
        // 클릭(다운) 후 요소 제거
        document.body.removeChild(anchor);
    }
}