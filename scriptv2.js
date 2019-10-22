const xlsx = require("xlsx");
const fs = require('fs');
const mysql = require('mysql');
const SQLBuilder = require('json-sql-builder2');
var sql = new SQLBuilder('MySQL');
var inquirer = require('inquirer');
var table;
var database;
var dropData ;
var seedExtension ; 
var pathSeed ; 


// 1) connexion à la bdd puis requete sql pour les champs colonne / type
// 2) formatage correcte pour le json + xlsx 
// 3) écriture du fichier json 
// 4) écriture xlsx 
// 5) connection finie

// fonctionnel !!!

function readbdd(database, table, dropData) {
    var conn = mysql.createConnection({
        database: database,
        host: "localhost",
        user: "root",
        password: "test123*"
    });
    conn.connect(function (err) {
        if (err) {
            throw err;
        }

        
        let sql1 = `TRUNCATE TABLE ${table}`;
        let sql2 = `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'${table}' and TABLE_SCHEMA = '${database}'`;
        // //console.log(sql2);
        if(dropData ==true){
            conn.query(sql1,function(err,results){
                if (err) {
                    throw err;
                }
            })

        }
        
        conn.query(sql2, function (err, results) {
            var keys = {};
            for (var i = 0; i < results.length; i++) {
                //console.log(results[i].COLUMN_NAME);
                key = results[i].COLUMN_NAME;
                type = results[i].COLUMN_TYPE
                //console.log(key);
                keys[key] = type;
            }
            //console.log(keys)
            // data du json
            switch(seedExtension.toString()){
                case 'xlsx' : 
                    console.log("yolo xlsx");
                    break ;
                case 'json' : 
                    console.log("yolo jason");
                    break ;
            }
            var jsonOut = [];
            jsonOut.push(keys);

            var newWB = xlsx.utils.book_new();
            var newWS = xlsx.utils.json_to_sheet(jsonOut);

            // écrit dans un nouveau fichier xslx
            xlsx.utils.book_append_sheet(newWB, newWS, "Sheet1");
            xlsx.writeFile(newWB, "testBdd3.xlsx");
            //console.log("ecriture tesBdd3.xlsx  ")


            //6) après modification dans le fichier lecture puis reformatage dans le json pour y introduire les données
            var wb = xlsx.readFile("testBdd3.xlsx", {
                cellDates: true
            });
            var ws = wb.Sheets["Sheet1"];
            var data = xlsx.utils.sheet_to_json(ws);
            fs.writeFile("testBdd3.json", (JSON.stringify(data, null, 4)), function (err) {
                if (err) throw err;
            });
        });

    });
    
}

/*
7) lecture du xlsx 
8) création du json avec donnée 
9) boucle avec req sql

*/

function writeDb(table,pathSeed) {
    var conn = mysql.createConnection({
        database: database,
        host: "localhost",
        user: "root",
        password: "test123*"
    });
    conn.connect(function (err) {
        if (err) {
            throw err;
        }
    
        console.log("Connected!");
        var wb = xlsx.readFile("testBdd3AvecDonne.xlsx", {
            cellDates: true
        });
        var ws = wb.Sheets["Sheet1"];
        var data = xlsx.utils.sheet_to_json(ws);
        fs.writeFile("testBdd3AvecDonne.json", (JSON.stringify(data, null, 4)), function (err) {
            if (err) throw err;

            fs.readFile('testBdd3AvecDonne.json', (err, data) => {
                if (err) throw err;
                let user = JSON.parse(data);

                // on boucle sur le nombre d'user, on ajoute les prop + les data dans deux array séparé, après on exec la requette en y passant les array 
                for (var i = 0; i < user.length; i++) {
                    var tabProp = [];
                    var dataUser = [];
                    for (var prop in user[i]) {
                        switch (prop.toString()) {
                            case 'createdAt':
                                break;
                            case 'updatedAt':
                                break;
                            case 'deletedAt':
                                break;
                            case 'id':
                                break;
                            case 'avatarId':
                                break;
                            default:
                                tabProp.push(prop);
                                dataUser.push(user[i][prop])
                        }
                    }

                    myQuery = sql.$insert({
                        $table: table,
                        $columns: tabProp,
                        $values: dataUser
                    });

                    conn.query(myQuery, function (err, result) {
                        if (err) throw err;
                    });
                }
            });
        });
    });  
}




async function main() {

    await
    inquirer
        .prompt([{
                type: 'input',
                message: ' database  ? ',
                default: 'nfw_17',
                name: 'database',
            },
            {
                type: 'input',
                message: ' table  ? ',
                default: 'user',
                name: 'table',
            },
            {
                type: 'confirm',
                message: ' delete les datas de la table  ? ',
                default: true,
                name: 'dropData',
            },
            {
                type: 'list',
                message: ' choissisez le format de l\'extension de votre fichier de seed  ? ',
                name: 'seedExtension',
                choices: ['json', 'xlsx']
            },
        ])
        .then(answers => {
            console.log(answers)
            database = answers.database;
            console.log("data : " + database);

            table = answers.table;
            console.log("table : " + table);

            dropData = answers.dropData ; 
            console.log("drop data ? : " + dropData);
            
            seedExtension =  answers.seedExtension;
            console.log(answers.seedExtension);

        });
    await readbdd(database, table,dropData,seedExtension);
    await console.log("remplissez vos fichier json / excel");
    await inquirer
        .prompt([{
            type: 'confirm',
            name: 'finis',
            message :'finis ? ',
            default: true,
        }])
        .then(answers => {
            {
                console.log(answers.finis);
                if(answers.finis==true){
                    writeDb(table,pathSeed);
                }   
            }
        });
}

main();