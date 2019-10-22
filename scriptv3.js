const xlsx = require("xlsx");
const fs = require('fs');
const mysql = require('mysql');
const SQLBuilder = require('json-sql-builder2');
const sql = new SQLBuilder('MySQL');
const inquirer = require('inquirer');
let table;
let database;
let dropData;
let seedExtension;
let pathSeed;
let seedName;
let seedMethode;

// 1) connexion à la bdd puis requete sql pour les champs colonne / type
// 2) formatage correcte pour le json + xlsx 
// 3) écriture du fichier json 
// 4) écriture xlsx 
// 5) connection finie

// fonctionnel !!!
function connection(database) {
    const conn = mysql.createConnection({
        database: database,
        host: "localhost",
        user: "root",
        password: "test123*"
    });
    return conn;
}

function readbdd(database, table) {
    const conn = connection(database);
    conn.connect(function (err) {
        if (err) {
            throw err;
        }



        let sql2 = `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'${table}' and TABLE_SCHEMA = '${database}'`;
        // //console.log(sql2);


        conn.query(sql2, function (err, results) {
            let keys = {};
            for (var i = 0; i < results.length; i++) {
                key = results[i].COLUMN_NAME;
                type = results[i].COLUMN_TYPE
                keys[key] = type;
            }


            let jsonOut = [];
            jsonOut.push(keys);



            //6) après modification dans le fichier lecture puis reformatage dans le json pour y introduire les données

            switch (seedExtension) {

                case 'xlsx':
                    let newWB = xlsx.utils.book_new();
                    let newWS = xlsx.utils.json_to_sheet(jsonOut);

                    // écrit dans un nouveau fichier xslx
                    xlsx.utils.book_append_sheet(newWB, newWS, table);
                    xlsx.writeFile(newWB, "testBdd3.xlsx");
                    let wb = xlsx.readFile("testBdd3.xlsx", {
                        cellDates: true
                    });
                    let ws = wb.Sheets[table];
                    let data = xlsx.utils.sheet_to_json(ws);
                    fs.writeFile("testBdd3.json", (JSON.stringify(data, null, 4)), function (err) {
                        if (err) throw err;
                    });
                    break;
                case 'json':
                    fs.writeFile("testBdd3.json", (JSON.stringify(jsonOut, null, 4)), function (err) {
                        if (err) throw err;
                    });
                    break;
            }
        });

    });
    console.log("lecture réussie");
}

/*
7) lecture du xlsx 
8) création du json avec donnée 
9) boucle avec req sql

*/

function writeDb(table, pathSeed, dropData) {
    const conn = connection(database);
    conn.connect(function (err) {
        if (err) {
            throw err;
        }

        let sql1 = `TRUNCATE TABLE ${table}`;
        if (dropData == true) {
            conn.query(sql1, function (err, results) {
                if (err) {
                    throw err;
                }
            })

        }
        let wb = xlsx.readFile(pathSeed, {
            cellDates: true
        });
        let ws = wb.Sheets[table];
        let data = xlsx.utils.sheet_to_json(ws);
        fs.writeFile(pathSeed, (JSON.stringify(data, null, 4)), function (err) {
            if (err) throw err;

            fs.readFile('testBdd3AvecDonne.json', (err, data) => {
                if (err) throw err;
                let user = JSON.parse(data);

                // on boucle sur le nombre d'user, on ajoute les prop + les data dans deux array séparé, après on exec la requette en y passant les array 
                for (let i = 0; i < user.length; i++) {
                    let tabProp = [];
                    let dataUser = [];
                    for (let prop in user[i]) {
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
    console.log("écriture réussie");
}

async function databaseConnectionInquire() {
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
                type: 'input',
                message: ' chemin du fichier  ? ',
                default: 'testBdd3AvecDonne.xlsx',
                name: 'path',
            },
        ])
        .then(answers => {
            database = answers.database;
            table = answers.table;
            pathSeed = answers.path;
        });
}

async function readInquire() {
    await
    inquirer
        .prompt([
            {
                type: 'list',
                message: ' choissisez le format de l\'extension de votre fichier de seed  ? ',
                name: 'seedExtension',
                choices: ['json', 'xlsx']
            }
        ])
        .then(answers => {
            seedExtension = answers.seedExtension;
        });
}

async function writeInquire() {
    await inquirer
        .prompt([{
            type: 'confirm',
            message: ' delete les datas de la table  ? ',
            default: true,
            name: 'dropData',
        }])
        .then(answers => {
            dropData = answers.dropData;
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
            console.log(seedMethode);
            await databaseConnectionInquire();
            await readInquire();
            await readbdd(database, table, dropData, seedExtension);
            break;
        case 'ecriture':
            console.log(seedMethode);
            await databaseConnectionInquire();
            await writeInquire();
            await writeDb(table, pathSeed, dropData);
            break;
        case 'lecture + ecriture':
            console.log(seedMethode);
            await databaseConnectionInquire();
            await readInquire();
            await readbdd(database, table, dropData, seedExtension);
            await console.log("remplissez vos fichier json / excel");
            await writeInquire();
            await writeDb(table, pathSeed, dropData);
            break;
    }
}

main();