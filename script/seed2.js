const xlsx = require("xlsx");
const fs = require('fs');
const mysql = require('mysql');
const SQLBuilder = require('json-sql-builder2');
const sql = new SQLBuilder('MySQL');
const inquirer = require('inquirer');
let database;
let dropData;
let seedExtension;
let pathSeedRead;
let pathSeedWrite;
let seedMethode;
let tableArray = [];
let tableTotal = 1;
// 1) connexion à la bdd puis requete sql pour les champs colonne / type
// 2) formatage correcte pour le json + xlsx 
// 3) écriture du fichier json 
// 4) écriture xlsx 
// 5) connection finie

function connection(database) {

    const conn = mysql.createConnection({
        database: database,
        host: "localhost",
        user: "root",
        password: "test123*"
    });
    return conn;
}

function readbdd(database, seedExtension, pathSeedRead) {

    const conn = connection(database);
    let objetDb = {};
    let newWB = xlsx.utils.book_new();
    conn.connect(function (err) {
        if (err) {
            throw err;
        }

        for (let i = 0; i < tableArray.length; i++) {
            let tableSql = tableArray[i];
            //console.log("table sql ? " + tableSql);
            let sql2 = `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'${tableSql}' and TABLE_SCHEMA = '${database}'`;

            //let sql2 = `select * from ${tableSql}`;
            conn.query(sql2, function (err, results) {
                console.log(results.length);

                let jsonOut = [];

                let keys = {};
                for (j = 0; j < results.length; j++) {

                    // supprime les colonnes inutiles

                    key = results[j].COLUMN_NAME;
                    type = results[j].COLUMN_TYPE
                    keys[key] = '';
                    delete keys.id;
                    delete keys.createdAt;
                    delete keys.updatedAt;
                    delete keys.deletedAt;
                    delete keys.avatarId;

                }
                jsonOut.push(keys);
                console.log(jsonOut);

                objetDb[tableSql] = jsonOut;
                //console.log(jsonOut);

                let newWS = xlsx.utils.json_to_sheet(jsonOut);
                xlsx.utils.book_append_sheet(newWB, newWS, tableSql);
                switch (seedExtension) {
                    case 'json':
                        if (i == tableArray.length - 1) {
                            objetDb[tableSql] = jsonOut;
                            objetDb[tableSql] = jsonOut;
                            fs.writeFile("../seed/" + pathSeedRead + ".json", (JSON.stringify(objetDb, null, 4)), function (err) {
                                if (err) throw err;
                            });
                        }
                        break;

                    case 'xlsx':
                        if (i == tableArray.length - 1) {
                            xlsx.writeFile(newWB, "../seed/" + pathSeedRead + ".xlsx");
                            fs.writeFile("../seed/" + pathSeedRead + ".json", (JSON.stringify(objetDb, null, 4)), function (err) {
                                if (err) throw err;
                            });
                        }
                        break;
                }
            });
            conn.end();
        }

    });

}

/*
    7) lecture du xlsx 
    8) création du json avec donnée 
    9) boucle avec req sql

*/

function writeDb(database, pathSeedWrite, seedExtension, dropData) {
    const conn = connection(database);
    conn.connect(function (err) {
        if (err) {
            throw err;
        }
        console.log(database);

        switch (seedExtension) {
            case 'json':
                console.log(pathSeedWrite + '.json');
                fs.readFile('../seed/' + pathSeedWrite + '.json', (err, data) => {
                    // on lit le fichier, on parse tout dans un objet, on récupère ses keys dans un tableau

                    var obj = JSON.parse(data);
                    let keyObject = Object.keys(obj);

                    let tableData;
                    for (i = 0; i < keyObject.length; i++) {
                        tableData = obj[keyObject[i]];
                        let table = keyObject[i];
                        let sql1 = `TRUNCATE TABLE ${table}`;
                        if (dropData == true) {
                            conn.query(sql1, function (err, results) {
                                if (err) {
                                    throw err;
                                }
                            })

                        }
                        for (let j = 0; j < tableData.length; j++) {
                            let tabProp = Object.keys(tableData[j]);
                            let dataValues = Object.values(tableData[j]);

                            myQuery = sql.$insert({
                                $table: table,
                                $columns: tabProp,
                                $values: dataValues
                            });

                            conn.query(myQuery, function (err, result) {
                                if (err) throw err;
                            });

                        }

                    }
                    conn.end();
                });

                break;
            case 'xlsx':
                let wb = xlsx.readFile('../seed/' + pathSeedWrite + '.xlsx', {
                    cellDates: true
                });
                var result = {};
                wb.SheetNames.forEach(function (sheetName) {
                    var roa = xlsx.utils.sheet_to_row_object_array(wb.Sheets[sheetName]);
                    if (roa.length > 0) {
                        result[sheetName] = roa;
                    }
                });
                fs.writeFile('../seed/' + pathSeedWrite + '.json', (JSON.stringify(result, null, 4)), function (err) {
                    if (err) throw err;
                });

                fs.readFile('../seed/' + pathSeedWrite + '.json', (err, data) => {
                    // on lit le fichier, on parse tout dans un objet, on récupère ses keys dans un tableau

                    var obj = JSON.parse(data);
                    let keyObject = Object.keys(obj);

                    let tableData;

                    for (i = 0; i < keyObject.length; i++) {
                        tableData = obj[keyObject[i]];
                        let table = keyObject[i];
                        let sql1 = `TRUNCATE TABLE ${table}`;
                        if (dropData == true) {
                            conn.query(sql1, function (err, results) {
                                if (err) {
                                    throw err;
                                }

                            })
                        }
                        for (let j = 0; j < tableData.length; j++) {
                            let tabProp = Object.keys(tableData[j]);
                            let dataValues = Object.values(tableData[j]);

                            myQuery = sql.$insert({
                                $table: table,
                                $columns: tabProp,
                                $values: dataValues
                            });

                            conn.query(myQuery, function (err, result) {
                                if (err) throw err;


                            });
                        }
                    }
                    conn.end();
                });
                break;
        }
    });
}

async function databaseConnectionInquire() {
    await
    inquirer
        .prompt([{
            type: 'input',
            message: ' database  ? ',
            default: 'nfw_17',
            name: 'database',
        }])
        .then(answers => {
            database = answers.database;
        });
}

async function howMuchTable() {

    for (let i = 0; i < tableTotal; i++) {
        if (i == 0) {
            await
            inquirer
                .prompt([{
                    type: 'input',
                    message: ' combien de table ? ',
                    default: 1,
                    name: 'tableTotal',
                }])
                .then(answers => {
                    tableTotal = answers.tableTotal;
                });
        }
        await
        inquirer
            .prompt([{
                type: 'input',
                message: ' table ? ',
                default: 'user',
                name: 'tableName',
            }])
            .then(answers => {
                tableArray[i] = answers.tableName;
            });
    }
}

async function readInquire() {
    await
    inquirer
        .prompt([{
                type: 'list',
                message: ' choissisez le format de l\'extension de votre fichier de seed  ? ',
                name: 'seedExtension',
                choices: ['json', 'xlsx']
            },
            {
                type: 'input',
                message: ' chemin du fichier  ? ',
                default: 'seed',
                name: 'path',
            },
        ])
        .then(answers => {
            seedExtension = answers.seedExtension;
            pathSeedRead = answers.path;
        });
}

async function writeInquire() {
    await inquirer
        .prompt([{
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
            {
                type: 'input',
                message: ' chemin du fichier  ? ',
                default: 'seedBddAvecDonne',
                name: 'path',
            },
        ])
        .then(answers => {
            dropData = answers.dropData;
            seedExtension = answers.seedExtension;
            pathSeedWrite = answers.path;
        });
}


async function main() {

    await inquirer.prompt([{
            type: 'list',
            message: ' choissisez le format de l\'extension de votre fichier de seed  ? ',
            name: 'methode',
            choices: ['lecture', 'ecriture', 'lecture + ecriture']
        }, ])
        .then(answers => {
            seedMethode = answers.methode;
        })

    switch (seedMethode) {
        case 'lecture':
            await databaseConnectionInquire();
            await readInquire();
            await howMuchTable();
            await readbdd(database, seedExtension, pathSeedRead);
            break;
        case 'ecriture':
            await databaseConnectionInquire();
            await writeInquire();
            await writeDb(database, pathSeedWrite, seedExtension, dropData);
            break;
        case 'lecture + ecriture':
            await databaseConnectionInquire();
            await readInquire();
            await readbdd(database, seedExtension, pathSeedRead);
            await console.log("remplissez vos fichier json / excel");
            await writeInquire();
            await writeDb(database, pathSeedWrite, seedExtension, dropData);
            break;
    }
}

main();