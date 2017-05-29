// FOLLOWING THE PRACTICES OF XGH

function getParameter(arg){
    return $.request.parameters.get(arg);
}

function getAllParameters(){
    var i = 0;
    var mensagem = 'Dados utilizados:<br /> ';
    while(i<$.request.parameters.length){
        if($.request.parameters[i].name !== 'crud' && $.request.parameters[i].name !== 'USER' && $.request.parameters[i].name !== '_'){
            mensagem += $.request.parameters[i].name + " -> " + $.request.parameters[i].value + ';<br /> ';
        }
        i++;
    }
    return mensagem;
    //return JSON.stringify($.request.parameters);
}

//SQL functions
function setSchema(conn, schema){
    conn.setAutoCommit(true);
    var pstmt = conn.prepareStatement("SET SCHEMA "+schema);
    pstmt.execute();
    pstmt.close();
}

function validateParameter(conn, sql, value){
    var exist = readSql(conn, sql, value);
    var result = exist.length > 0 ? true : false;
    return result;
}

function oneSql(conn, sql) { 
    try { 
        var pstmt = conn.prepareStatement(sql); 
        pstmt.execute(); 
        pstmt.close(); 
    } catch(e) {
        throw e;
    } 
}  

function readSql(conn, sql, filters){
    try{
        var i;
        var result = [];
        var metaData = getMetaData(conn, sql);
        var pstmt = conn.prepareStatement(sql);
        
        // set optional filters
        if(filters){
            var pIndex = 1;
            for(i=0; i < filters.length; i++) {
                setInProcParam(pstmt, filters[i], pIndex);
                pIndex++;
            }
        }
        
        var rs = pstmt.executeQuery();
        
        var obj, line = {};
        while(rs.next()){
            for(i=0; i<metaData.length; i++){
                obj = metaData[i];
                switch(obj.type){
                    case 'DATE':
                        line[obj.name] = rs.getDate(i+1);
                        break;
                    case 'DECIMAL':
                        line[obj.name] = rs.getDecimal(i+1);
                        break;
                    case 'INTEGER':
                        line[obj.name] = rs.getInteger(i+1);
                        break;
                    case 'NVARCHAR':
                        if(rs.getString(i+1) === null){
                            line[obj.name] =rs.getString(i+1);
                        }
                        else{
                            line[obj.name] = decodeURIComponent(escape(rs.getString(i+1)));
                        }
                        break;   
                    default:
                        if(rs.getString(i+1) === null){
                            line[obj.name] =rs.getString(i+1);
                        }
                        else{
                            line[obj.name] = decodeURIComponent(escape(rs.getString(i+1)));
                        }
                        break;
                } 
            }
            result.push(JSON.parse(JSON.stringify(line)));
        }
        pstmt.close();
        return result;
    }
    catch(e){
        throw e;
    }
}

// depreciated
function readSqlFilters(conn, sql, filters){
    return readSql(conn, sql, filters);
    /*try{
        var result = [];
        var metaData = getMetaData(conn, sql);
        var pstmt = conn.prepareStatement(sql);
        var tempObj = {};
        var i, obj;
        var pIndex = 1;
        for(i=0; i<filters.length; i++) {
            setInProcParam(pstmt, filters[i], pIndex);
            pIndex++;
        }
        var rs = pstmt.executeQuery();
        while(rs.next()){
            for(i=0; i<metaData.length; i++){
                obj = metaData[i];
                switch(obj.type){
                    case "DATE":
                        tempObj[obj.name] = rs.getDate(i+1);
                        break;
                    case "DECIMAL":
                        tempObj[obj.name] = rs.getDecimal(i+1);
                        break;
                    case "INTEGER":
                        tempObj[obj.name] = rs.getInteger(i+1);
                        break;
                    case "NVARCHAR":
                        tempObj[obj.name] = rs.getString(i+1);
                        break;   
                    default:
                        tempObj[obj.name] = rs.getString(i+1);
                        break;
                } 
            }
            result.push(JSON.parse(JSON.stringify(tempObj)));
        }
    	return result;
    }
    catch(e){
        throw e;
    }*/
}

function insertSql(conn, sql, param){
    try{
        var pstmt = conn.prepareStatement(sql);
        var i, rs;
        var pIndex = 1;
        for(i=0; i < param.length; i++) {
            setInProcParam(pstmt, param[i], pIndex);
            pIndex++;
        }
        rs = pstmt.execute();
        pstmt.close();
        conn.commit();
    } catch(e) {
        // SQL Error Codes
        // Reference: https://help.sap.com/saphelp_hanaplatform/helpdata/en/20/a78d3275191014b41bae7c4a46d835/content.htm
        switch(e.code){
            case 274:
                e.message = 'Inserted value too large for column';
            break;
            default:
                e.message = 'Unknown Exception on main.insertSql';
            break;
        }
        throw e;
    }
}

function updateSql(conn, sql, param){
    try{
        var pstmt = conn.prepareStatement(sql);
        var i, rs;
        var pIndex = 1;
        for(i=0; i < param.length; i++) {
            setInProcParam(pstmt, param[i], pIndex);
            pIndex++;
        }
        rs = pstmt.executeUpdate();
        conn.commit();
        pstmt.close();
    }
    catch(e){
        throw e;
    }
}

function getSequence(conn, sql){
    var sequence = readSql(conn, sql);
    return sequence;
}

function deleteSql(conn, sql, filters){
    try{
        var pstmt = conn.prepareStatement(sql);
        var i;
        var pIndex = 1;
        for(i=0; i<filters.length; i++) {
            setInProcParam(pstmt, filters[i], pIndex);
            pIndex++;
        }
        var rs = pstmt.executeUpdate();
        conn.commit();
        pstmt.close();
    }
    catch(e){
        throw e;
    }
}

function getMetaData(conn, sql, tableName){
    var metaData = [];
    try{
        var pstmt = conn.prepareStatement(sql);
        var rsm = pstmt.getMetaData();
        for(var i=1; i<=rsm.getColumnCount(); i++){
            metaData.push({
                type: rsm.getColumnTypeName(i),
                name: rsm.getColumnLabel(i)
            });
        }
        pstmt.close();
        return metaData;
    }
    catch(e){
        throw e;
    }
}

function setInProcParam(pstmt, inParam, index) {
    // $.trace.error("setInProcParam: "+ inParam.type +" "+ inParam.value +" "+ index);
    try {
        if(inParam.value === null)
            pstmt.setNull(index);
        else if(inParam.type === $.db.types.DATE)
            pstmt.setDate(index, inParam.value);
        else if(inParam.type === $.db.types.DECIMAL)
            pstmt.setDecimal(index, inParam.value);
        else if(inParam.type === $.db.types.INTEGER)
            pstmt.setInteger(index, inParam.value);
        else if(inParam.type === $.db.types.NCHAR || inParam.type === $.db.types.NVARCHAR)
            pstmt.setNString(index, inParam.value);
        else
            throw {error: 10001, location: "setInProcParam", message: "$.db.type not supported on this function"};
    } catch(e) {
        throw {
            error: 10001, 
            location: "setInProcParam", 
            message: "Error when setting parameter "+ index +
                        ", type "+ inParam.type +
                        " with value "+ inParam.value + (e.message) ? ' : '+ e.message : ''
        };
    }
}

function getOutProcParam(pstmt, outParam) {
    var out;
    try {
        if(outParam.type === $.db.types.DATE)
            out = pstmt.getDate(outParam.index);
        else if(outParam.type === $.db.types.DECIMAL)
            out = pstmt.getDecimal(outParam.index);
        else if(outParam.type === $.db.types.INTEGER)
            out = pstmt.getInteger(outParam.index);
        else if(outParam.type === $.db.types.NCHAR || outParam.type === $.db.types.NVARCHAR)
            out = pstmt.getNString(outParam.index);
        else
            throw {error: 10001, location: "getOutProcParam", message: "$.db.type not supported on this function"};
        return out;
    } catch(e){
        throw {
            error: 10001, 
            location: "getOutProcParam", 
            message: "Error when getting parameter "+ outParam.index +
                        ", type "+ outParam.type + (e.message) ? ' : '+ e.message : ''
        };
    }
}

function getProcResultSets(rs) {
    var i;
    var result = [];
    var line = {};
    try{
        var rsm = rs.getMetaData();
        while(rs.next()){
            line = {};
            for(i = 0; i < rsm.getColumnCount(); i++){
                switch(rsm.getColumnType(i+1)){
                    case $.db.types.DATE:
                        line[rsm.getColumnName(i+1)] = rs.getDate(i+1);
                    break;
                    case $.db.types.DECIMAL:
                        line[rsm.getColumnName(i+1)] = rs.getDecimal(i+1);
                    break;
                    case $.db.types.INTEGER:
                        line[rsm.getColumnName(i+1)] = rs.getInteger(i+1);
                    break;
                    case $.db.types.NCHAR:
                    case $.db.types.NVARCHAR:
                        line[rsm.getColumnName(i+1)] = rs.getString(i+1);
                    break;   
                    default:
                        line[rsm.getColumnName(i+1)] = rs.getString(i+1);
                    break;
                }
            }
            result.push(JSON.parse(JSON.stringify(line)));
        }
        return result;
    } catch(e) {
        throw e;
    }
}

function executeProcedure(conn, proc, inParams, outParams){
    try {
        var cstmt = conn.prepareCall("{CALL "+proc+"}");
        
        var pIndex = 1;
        for(var i=0; i < inParams.length; i++) {
            setInProcParam(cstmt, inParams[i], pIndex);
            pIndex++;
        }
        
        var result = [];
        if( cstmt.execute() ){
            var rs;
            do {
                rs = cstmt.getResultSet();
                result.push( getProcResultSets(rs) );
                rs.close();
            } while(cstmt.getMoreResults());
        } else if(outParams instanceof [].constructor){
            for(var j = 0; j < outParams.length; j++) {
                result.push( getOutProcParam(cstmt, outParams[j]) );
            }
        }
        conn.commit();
        
        cstmt.close();
        return result;
    } catch(e) {
        throw e;
    }
}

//CRUD functions
function getOperation(){ 
    if($.request.parameters.get('crud')){
        var crud = $.request.parameters.get('crud');
        return (typeof crud === 'string') ? crud.toUpperCase() : '';
    }
    else{
        return 'nOn';
    }
}

function getSuccessMsg(entity, crudOp, pk, data){
    var pkStr;
    var opStr;
    if(crudOp === 'create'){
        pkStr = '';
        opStr = 'criado';
    } else if(crudOp === 'read' && pk){
        pkStr = ' '+ pk;
        opStr = 'lido';
    } else if(crudOp === 'read'){
        pkStr = 's';
        opStr = 'lidos';
    } else if(crudOp === 'update'){
        pkStr = ' '+ pk;
        opStr = 'alterado';
    } else if(crudOp === 'delete'){
        pkStr = ' '+ pk;
        opStr = 'deletado';
    } else {
        throw {
            error: 10011, 
            location: "getSuccessMsg",
            message: "Param 'crudOp'=${crudOp} not supported on this function".replace('${crudOp}',crudOp)
        };
    }
    
    return {
        "success": true,
        "data": data,
        "message": 'Cadastro${pk} de ${entity} ${op} com sucesso'
                        .replace('${pk}', pkStr)
                        .replace('${entity}', entity)
                        .replace('${op}', opStr)
    };
}
function getMissingParamError(entity, pk, operation){
    var errParams = {};
    errParams[pk] = getParameter(pk);
    
    var opStr;
    if(['read','findone'].indexOf(operation) > -1)
        opStr = 'leitura';
    else if(operation === 'update')
        opStr = 'atualização';
    else if(operation === 'export')
        opStr = 'exportação'
    
    return {
        "success": false, 
        "message": 'Erro na ${op} de ${entity}: parâmetro ${pk} faltando'
                        .replace('${op}', opStr)
                        .replace('${entity}', entity)
                        .replace('${pk}', pk), 
        "error_code": 10, 
        "error_param": errParams
    };
}
function getInvalidParamError(entity, pk, operation){
    var errParams = {};
    errParams[pk] = getParameter(pk);
    
    var opStr;
    if(['read','findone'].indexOf(operation) > -1)
        opStr = 'leitura';
    else if(operation === 'update')
        opStr = 'atualização';
    
    return {
        "success": false, 
        "message": 'Erro na ${op} de ${entity}: parâmetro ${pk} inválido'
                        .replace('${op}', opStr)
                        .replace('${entity}', entity)
                        .replace('${pk}', pk), 
        "error_code": 11, 
        "error_param": errParams
    };
}
function getDuplicityError(entity, pk){
    var errParams = {};
    errParams[pk] = getParameter(pk);
    
    return {
        "success": false, 
        "message": 'Erro na criação de ${entity}: item ${pk} já cadastrado no sistema'
                        .replace('${entity}', entity)
                        .replace('${pk}', getParameter(pk)),
        "error_code": 20, 
        "error_param": errParams
    };
}
function getNoDataFoundError(entity, pk){
    
    return {
        "success": false, 
        "message": 'Erro na leitura de ${entity}: item ${pk} não cadastrado no sistema'
                        .replace('${entity}', entity)
                        .replace('${pk}', pk),
        "error_code": 21,
        "error_param": {}
    };
}
function getMultipleDataFoundError(entity, pk){
    
    return {
        "success": false, 
        "message": 'Erro na leitura de ${entity}: multiplos itens ${pk} cadastrados no sistema'
                        .replace('${entity}', entity)
                        .replace('${pk}', pk),
        "error_code": 22,
        "error_param": {}
    };
}
function getExceptionOutput(e){
    return {
        "success": false,
        "exception": e,
        "message": JSON.stringify(e)
    };
}

function login(){
    
}

function logout(){
    
}

function auth(){
    
}

function setToken(){
    var rand = function(){
        return Math.random().toString(36).substr(2);
    };
    return rand() + rand();  
}

function getToken(){
    return rand() + rand();  
}

function checkToken(){
    var valid = false;
    var user = getParameter('u').toLowerCase();
    var token = getParameter('t');
    
    if(!user || user === '')
        return valid;
    if(!token || token === '')
        return valid;
    
    try {
        //CONNECT TO HANA
        var conn = $.db.getConnection();
        setSchema(conn, 'EDCA');
        
        var data = readSql(conn, 'SELECT COUNT(*) AS AMOUNT FROM "csc.dca.db.tbl::TSIS.SIS_USUARIOS" WHERE LOWER(CD_USUARIO) = ? AND DS_TOKEN = ?', [
            {type : $.db.types.NVARCHAR, value: user},
            {type : $.db.types.NVARCHAR, value: token}
        ]);
        
        valid = (data[0]['AMOUNT'] == 1);
    } catch(e) {
        throw e;
    } finally {
        return valid;
    }
}

function getServerConfig(conn){
    var i, cur;
    var sql = 'SELECT DS_CHAVE, DS_VALOR FROM \"csc.dca.db.tbl::TSIS.SIS_CONFIGURACOES\"';
    var filters = [];
    var rs = readSql(conn, sql);
    var config = {};
    for(i=0; i<rs.length; i++){
        config[rs[i].DS_CHAVE] = rs[i].DS_VALOR;
    }
    return config;
}

function formatHttpRequestParams(params){
    var paramStr = '';
    if(typeof params === 'object'){
        for(var i in params){
            if(paramStr === '')
                paramStr += '?'+ i +'='+ params[i];
            else 
                paramStr += '&'+ i +'='+ params[i];
        }
    }
    return paramStr;
}

/**
 * Function requestGet
 * Execute HTTP GET request to an external webservice
 * @param  url      {string}    URL of the external webservice
 * @param  content  {object}    list of key:value to be sent as HTTP GET parameters
 * @return          {string}    String containing the body of response. If there is no body, the 
 *                              function returns stringified object with the response status code
 */
function requestGet(url, content){
    var dest = url;
    var client = new $.net.http.Client();
    var req = new $.web.WebRequest($.net.http.GET,'');
    
    // set parameters on HTTP GET
    // content = {a:'foo', b: 'bar', c: {x: 'y'}}    =>  ?a=foo&b=bar&c=%7B%22x%22%3A%22y%22%7D
    for(var i in content)
        req.parameters.set(i, (typeof content[i] === 'string') ? content[i]: JSON.stringify(content[i]));
        
    client.request(req, dest);
    var response = client.getResponse();
    if (response.body) {
        return response.body.asString();
    } else{
       return JSON.stringify({error : response.status});
    }
}

/**
 * Function requestPost
 * Execute HTTP POST request to an external webservice
 * @param  url      {string}    URL of the external webservice
 * @param  content  {object}    list of key:value to be sent in the body of POST request
 * @return          {string}    String containing the body of response. If there is no body, the 
 *                              function returns stringified object with the response status code
 */
function requestPost(url, content){
    var client = new $.net.http.Client();
    var req = new $.web.WebRequest($.net.http.POST,'');
    req.contentType = "application/x-www-form-urlencoded";

    // set parameters in the body of HTTP POST
    // content = {a:'foo', b: 'bar', c: {x: 'y'}}    =>  a=foo&b=bar&c=%7B%22x%22%3A%22y%22%7D
    for(var i in content)
        req.parameters.set(i, (typeof content[i] === 'string') ? content[i]: JSON.stringify(content[i]));
    
    client.request(req, url);
    var response = client.getResponse();
    if (response.body) {
        return response.body.asString();
    } else {
       return JSON.stringify({error : response.status});
    }
}

// Auth functions
function allowOperation(conn){
    var ID_USUARIO = app.getParameter('ID_USUARIO');
    var result;
    if(app.getParameter('ID_FILIAL')){
        result = app.readSql(conn, 'SELECT CASE WHEN (USU.DT_INICIAL <= NOW()) THEN \'T\' ELSE \'F\' END AS AUTH FROM \"csc.dca.db.tbl::TSIS.SIS_USUARIOS\" USU LEFT JOIN \"csc.dca.db.tbl::TSIS.SIS_USUARIOS_FILIAL\" SIS ON SIS.ID_USUARIO = USU.ID_USUARIO INNER JOIN \"csc.dca.db.tbl::TSIS.SIS_FILIAIS\" FIL ON SIS.ID_FILIAL = FIL.ID WHERE USU.ID_USUARIO = ? AND FIL.ID = ? AND USU.IND_STATUS <> \'D\'',[
            {type : $.db.types.NVARCHAR, value: ID_USUARIO},
            {type : $.db.types.NVARCHAR, value: app.getParameter('ID_FILIAL')}
        ]);
    }
    else{
        if(app.getParameter('NR_CNPJ') || app.getParameter('CNPJ')){
            var CNPJ = (app.getParameter('NR_CNPJ')) ? app.getParameter('NR_CNPJ') : app.getParameter('CNPJ');
            result = app.readSql(conn, 'SELECT CASE WHEN (USU.DT_INICIAL <= NOW()) THEN \'T\' ELSE \'F\' END AS AUTH FROM \"csc.dca.db.tbl::TSIS.SIS_USUARIOS\" USU LEFT JOIN \"csc.dca.db.tbl::TSIS.SIS_USUARIOS_FILIAL\" SIS ON SIS.ID_USUARIO = USU.ID_USUARIO INNER JOIN \"csc.dca.db.tbl::TSIS.SIS_FILIAIS\" FIL ON SIS.ID_FILIAL = FIL.ID WHERE USU.ID_USUARIO = ? AND FIL.NR_CNPJ = ? AND USU.IND_STATUS <> \'D\'',[
                {type : $.db.types.NVARCHAR, value: ID_USUARIO},
                {type : $.db.types.NVARCHAR, value: app.getParameter('NR_CNPJ')}
            ]);    
        }
        else{
            result = app.readSql(conn, 'SELECT CASE WHEN (DT_INICIAL <= NOW()) THEN \'T\' ELSE \'F\' END AS AUTH FROM \"csc.dca.db.tbl::TSIS.SIS_USUARIOS\" WHERE ID_USUARIO = ? AND IND_STATUS <> \'D\'',[
                {type : $.db.types.NVARCHAR, value: ID_USUARIO}
            ]);
        }
    }
    if(result.length > 0 && result[0].AUTH === 'T'){
        return true;
    }
    else{
        return false;
    }
}

//LOG functions
function setLog(conn, user, action, desc, msg){
    try {
        if(desc !== 'READ' && desc !== 'READ_FILTERS' && desc !== 'LIST_TOP' && user ){  
            var sql = 'INSERT INTO \"csc.dca.db.tbl::TSIS.SIS_LOG\" VALUES (\"csc.dca.db.seq::SEQ_SIS_LOG\".NEXTVAL, ?, CURRENT_TIMESTAMP, ?, ?, ?)';
            insertSql(conn, sql, [
                {type : $.db.types.NVARCHAR,    value: user},
                {type : $.db.types.NVARCHAR,    value: action}, 
                {type : $.db.types.NVARCHAR,    value: desc}, 
                {type : $.db.types.NVARCHAR,    value: msg}
            ]); 
        }
    } catch(e) {
        throw e;
    }
    
}

function getLog(filters){
    var result
    if(filters.length > 0){
        result = readSqlFilters(conn, "SELECT TOP 5000 * FROM \"csc.dca.db.tbl::TSIS.SIS_LOG\" WHERE CD_USUARIO LIKE '%"+getParameter('CD_USUARIO')+"%' AND DS_ACAO LIKE '%"+getParameter('DS_ACAO')+"%' AND DT_LOG > TO_TIMESTAMP(?,'DD-MM-YYYY HH24:MI:SS') AND DT_LOG < TO_TIMESTAMP(?,'DD-MM-YYYY HH24:MI:SS') AND DS_DESCRICAO NOT IN ('LIST_TOP', 'SIDEBAR', 'MENU', 'LIST_PERFIL', 'LIST_FILIAIS','LIST_FILES','LIST') AND CD_USUARIO IS NOT NULL ORDER BY DT_LOG DESC",filters);
        return {"data":result};
    }
    else{
        result = readSql(conn, 'SELECT TOP 5000 * FROM \"csc.dca.db.tbl::TSIS.SIS_LOG\" WHERE DS_DESCRICAO NOT IN (\'LIST_TOP\', \'SIDEBAR\', \'MENU\', \'LIST_PERFIL\', \'LIST_FILIAIS\',\'LIST_FILES\',\'LIST\') AND CD_USUARIO IS NOT NULL ORDER BY DT_LOG DESC');
        return {"data":result};
    }
}

var getRelatorioTable = function(idRelatorio){
    var result = readSql(conn,'SELECT NM_TABELA FROM "csc.dca.db.tbl::TSIS.SIS_RELATORIO" WHERE ID_RELATORIO = ?', [
        {type : $.db.types.DECIMAL, value: idRelatorio},    
    ]);
    return result[0].NM_TABELA;
}

//CODE Library
var code = {
    duplicate: ''
}






//DATE functions
function dateConvert(date, currentFormat, newFormat){
    var newDate, day, month, year;
    var pattern = currentFormat.search('-') > -1 ?  '-' : '/';
    var newPattern = newFormat.search('-') > -1 ?  '-' : '/';
    if(currentFormat !== newFormat){
        if(currentFormat.indexOf(pattern) === 2){
            if(currentFormat.substr(0,2) === 'dd'){
                day = date.substr(0,2);
                month = date.substr(3,2);
                year = date.substr(6,4);
            }   
            else{
                month = date.substr(0,2);
                day = date.substr(3,2);
                year = date.substr(6,4);
            }
        }
        else{
            if(currentFormat.substr(5,2) === 'dd'){
                year = date.substr(0,4);
                day = date.substr(4,2);
                month = date.substr(6,2);
            }
            else{
                year = date.substr(0,4);
                month = date.substr(4,2);
                day = date.substr(6,2);
            }
        }
        switch(newFormat){
            case "yyyy-mm-dd":
                return year+'-'+month+'-'+day;
                break;
            case "yyyy-dd-mm":
                return year+'-'+day+'-'+month;
                break;
            case "dd-mm-yyyy":
                return month+'-'+day+'-'+year;
                break;
            case "mm-dd-yyyy":
                return day+'-'+month+'-'+year;
                break;
        }
    }
    else{
        newDate = date;
    }
    return newDate;
}