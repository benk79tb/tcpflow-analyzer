const fs = require('fs');
const path = require('path');
const htmlparser2 = require('htmlparser2');
const { exec } = require('child_process');

console.log('Hello World!');
const dataFolder = './data';


let actors = {};
let requestResponseExchanges = []
let logContent = [];


loadLog();
loadActorsAndExchanges();


let times = getStepDateTimes('Issuing credential', 'Credential issued');

let issuingExchanges = requestResponseExchanges.filter(exchange => {
    let actorNames = ['valais', 'witness_1', 'witness_2', 'witness_3'];
    return isBetween(times, exchange) && includesActors(actorNames, exchange);
});

let initialisingExchanges = requestResponseExchanges.filter(exchange => {
    let actorNames = ['ben', 'witness_1', 'witness_2', 'witness_3'];
    return isBetween(getStepDateTimes('Data cleaned up', 'Actors are ready'), exchange) &&
         includesActors(actorNames, exchange);
});

let retrievingExchanges = requestResponseExchanges.filter(exchange => {
    return isBetween(getStepDateTimes('Receiving credential', 'Credential received'), exchange);
});

let presentingExchanges = requestResponseExchanges.filter(exchange => {
    return isBetween(getStepDateTimes('Presenting credential', 'Credential presented'), exchange);
});



let verifyingExchanges = requestResponseExchanges.filter(exchange => {
    return isBetween(getStepDateTimes('Verifying credential', 'Experience done'), exchange);
    return isBetween(getStepDateTimes('Verifying credential', 'Valid credential b'), exchange);
});


let noactionExchanges = requestResponseExchanges.filter(exchange => {
    return isBetween(getStepDateTimes('No actions started', 'No actions finished'), exchange);
});


generateUmlDiagram('initialize_diagram', initialisingExchanges, () => {});
generateUmlDiagram('issue_diagram', issuingExchanges, () => {});
generateUmlDiagram('retrieve_diagram', retrievingExchanges, () => {});
generateUmlDiagram('present_diagram', presentingExchanges, () => {});
generateUmlDiagram('verify_diagram', verifyingExchanges, () => {});
generateUmlDiagram('noaction_diagram', noactionExchanges, () => {});

// process.exit(0);



generateUmlDiagram('full_diagram', requestResponseExchanges, () => {});


function getStepDateTimes(startString, endString) {

    let startLine = logContent.find(line => line.message.includes(startString));
    let endLine = logContent.find(line => line.message.includes(endString));

    if (!startLine || !endLine) {
        return null;
    }

    return { start: new Date(`${startLine.date} ${startLine.time}`), end: new Date(`${endLine.date} ${endLine.time}`) };

}


function isBetween(times, exchange) {
    let start = exchange.exchanges[0].startime.getTime();
    return start >= times.start.getTime() && start <= times.end.getTime();
}

function includesActors(actorNames, exchange) {
    let actorsIps = [];

    actorNames.forEach(actor => {
        let ip = actors[actor];
        actorsIps.push(ip);
    });

    console.log(actorsIps);
    return actorsIps.includes(exchange.exchanges[0].src_ipn) && actorsIps.includes(exchange.exchanges[0].dst_ipn);
}

function loadLog() {
    logFilePath = path.join(dataFolder, 'experience.log');

    if (fs.existsSync(logFilePath)) {
        logLines = fs.readFileSync(logFilePath, 'utf8').split('\n');
    }

    logContent = logLines.map(line => {
        let parts = line.split(' ');
        let date = parts[0];
        let time = parts[1];
        let message = parts.slice(2).join(' ');
        return { date, time, message };
    });
}

function loadActorsAndExchanges() {

    let files = fs.readdirSync(dataFolder);

    // fs.readdir(dataFolder, (err, files) => {
    let actorsFolders = [];
    files.forEach(file => {
        console.log(file);
        let filePath = path.join(dataFolder, file);
        if (fs.statSync(filePath).isDirectory()) {
            actorsFolders.push(filePath);
        }
    });

    actorsFolders.forEach(actorFolder => {
        console.log(actorFolder);
        let ipFilePath = path.join(actorFolder, 'log', 'ip.txt');
        if (fs.existsSync(ipFilePath)) {
            let ip = fs.readFileSync(ipFilePath, 'utf8').trim();
            let actorName = path.basename(actorFolder);
            actors[actorName] = ip;
        }
    });

    let exchanges = [];

    actorsFolders.forEach(actorFolder => {

        let logsDir = path.join(actorFolder, 'log/tcpflow');
        let reportFilePath = path.join(logsDir, 'report.xml');

        if (fs.existsSync(reportFilePath)) {
            let reportContent = fs.readFileSync(reportFilePath, 'utf8');
            let fileObjects = extractFileObjects(reportContent);

            fileObjects.forEach(fileObject => {
                let exists = exchanges.find(exchange => {
                    return (exchange.src_ipn === fileObject.src_ipn &&
                    exchange.dst_ipn === fileObject.dst_ipn &&
                    exchange.srcport === fileObject.srcport &&
                    exchange.dstport === fileObject.dstport)
                });

                if (exists) {
                    return;
                }


                let fileName = fileObject.filename.split('/').pop();
                let filePath = path.join(logsDir, fileName);
                let fileContent = fs.readFileSync(filePath, 'utf8');
                fileObject.content = fileContent;



                exchanges.push(fileObject);
            });

            // let fileObjectsAsObjects = convertToObjects(fileObjects);
            console.log(fileObjects.length);
            // process.exit(0);
        }

        return;
        if (fs.existsSync(logsDir)) {
            fs.readdir(logsDir, (err, files) => {
                if (err) {
                    console.error(err);
                    return;
                }


                files.forEach(file => {
                    let logFilePath = path.join(logsDir, file);
                    let logContent = fs.readFileSync(logFilePath, 'utf8');
                    let lines = logContent.split('\n');
                    lines.forEach(line => {
                        let match = line.match(/(\d+\.\d+\.\d+\.\d+)\.(\d+) > (\d+\.\d+\.\d+\.\d+)\.(\d+)/);
                        if (match) {
                            let srcIp = match[1];
                            let dstIp = match[3];
                            exchanges.push({ srcIp, dstIp });
                        }
                    });
                });

                //generateUmlDiagram();
            });
        }
    });



    exchanges.forEach(exchange => {

        let endpoints = []; 

        let src = {
            ip: exchange.src_ipn,
            port: exchange.srcport
        }
        let dst = {
            ip: exchange.dst_ipn,
            port: exchange.dstport
        }

        function getExistingRequestResponseExchange(exchange) {
            return requestResponseExchanges.find(ex => {
                if (ex.endpoints[0].ip === src.ip && ex.endpoints[0].port === src.port && ex.endpoints[1].ip === dst.ip && ex.endpoints[1].port === dst.port ||
                    ex.endpoints[1].ip === src.ip && ex.endpoints[1].port === src.port && ex.endpoints[0].ip === dst.ip && ex.endpoints[0].port === dst.port) {
                    return true;
                }
                return false;
            });
        }

        endpoints.push(src);
        endpoints.push(dst);

        let requestResponseExchange = getExistingRequestResponseExchange(exchange);
        if (requestResponseExchange) {
            requestResponseExchange.exchanges.push(exchange);
            let exchanges = requestResponseExchange.exchanges.sort((a, b) => {
                return a.startime - b.startime;
            });
            requestResponseExchange.exchanges = exchanges
        }
        else {
            requestResponseExchange = {
                endpoints: endpoints,
                exchanges: [exchange]
            }
            requestResponseExchanges.push(requestResponseExchange);
        }
    });


    requestResponseExchanges.sort((a, b) => {
        return a.exchanges[0].startime - b.exchanges[0].startime;
    });
    // });
    
}



async function generateUmlDiagram(fn, requestResponseExchanges, cb) {
    let umlContent = '\nsequenceDiagram\n';

    // messageCb = messageCb || (_ => {});
    let options = {
        detailed: true
    }

    messageCb = (exchange) => {
        let message = exchange.content.split('\n')[0];

        if (message.includes('HTTP/1.1')) {
            message = message.replace('HTTP/1.1', '').trim();
        }

        if (message.length > 30) {
            message = message.substr(0, 50) + '...';
        }

        if (message == '204 No Content') {
            return message;
        }

        message = `${exchange.srcport}:${exchange.dstport} - ${message}`

        return message;
    };


    function splitTcpFlow(rawTcpFlow) {
        // const requestsAndResponses = rawTcpFlow.split(/(?=(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|HTTP\/1\.1) )/gm);

        const delimiter = rawTcpFlow.split(' ')[0];
        const requestsAndResponses = rawTcpFlow.split(delimiter);
        // console.log(requestsAndResponses);
        // process.exit(0);
        // Combine le délimiteur avec la partie qui suit
        const combined = [];
        for (let i = 1; i < requestsAndResponses.length; i++) {
            combined.push(delimiter + requestsAndResponses[i]);
        }

        // if (combined.length > 2) {
        //     console.log(combined.length);
        //     console.log(combined);

        //     // console.log(combined);
        //     process.exit(0);
        //         // combined.push('204 No Content');
        // }

        // Afficher les requêtes et réponses séparées avec les délimiteurs
        // console.log(combined);

        return combined;
    }


    requestResponseExchanges.forEach(requestResponseExchange => {

        let exchanges = requestResponseExchange.exchanges;

        if (options.detailed) {
            requests = splitTcpFlow(exchanges[0].content);
            responses = splitTcpFlow(exchanges[1].content);

            for (let i = 0; i < requests.length; i++) {
                let request = {...exchanges[0]};
                request.content = requests[i];

                let response = {...exchanges[1]};
                response.content = responses[i];
                
                addUmlMessages(request, response);
            }
        } else {
            let request = exchanges[0];
            let response = exchanges[1];

            addUmlMessages(request, response);
        }


        function addUmlMessages(request, response) {

            let srcActor = getActorByIp(request.src_ipn);
            let dstActor = getActorByIp(request.dst_ipn);
    
            if (srcActor && dstActor) {
                umlContent += `  ${srcActor}->>${dstActor}: ${messageCb(request)}\n`;
            }
    
            let responseMessage = messageCb(response);
            if (responseMessage == '204 No Content') {
                return;
            }
            srcActor = getActorByIp(response.src_ipn);
            dstActor = getActorByIp(response.dst_ipn);
    
            if (srcActor && dstActor) {
                umlContent += `  ${srcActor}-->>${dstActor}: \n`;
            }
        }
    });
    
    const tempMermaidFile = 'output/' +fn + '.mmd';
    fs.writeFileSync(tempMermaidFile, umlContent);

    console.log('Generating UML diagram...');

    exec(`mmdc -i ${tempMermaidFile} -o output/${fn}.png`, (err, stdout, stderr) => {
        if (err) {
            console.error(`Erreur lors de la génération du diagramme: ${stderr}`);
            return;
        }
        console.log(`UML sequence diagram generated: ${fn}.svg`);
        // fs.unlinkSync(tempMermaidFile); // Supprimer le fichier temporaire
        if (cb) {
            cb();
        }
    });        
}


function getActorByIp(ip) {
    let actorName = Object.keys(actors).find(actor => actors[actor] === ip)
    return actorName || 'vLEI Server';
}

function extractFileObjects(reportContent) {
    const dom = htmlparser2.parseDocument(reportContent);
    return getFileobjectsNodes(dom);
}

function getFileobjectsNodes(node) {

    let dfxmlNode = node.children.find(child => child.name === 'dfxml');
    let configurationNodes = dfxmlNode.children.filter(child => child.name === 'configuration');

    let fileobjectNodes = [];
    configurationNodes.forEach(configurationNode => {

        configurationNode.children.filter(child => child.name === 'fileobject').forEach(fileobjectNode => {
            fileobjectNodes.push(fileobjectNode);
        });
    });

    let fileObjects = fileobjectNodes.map(node => {

        let fObj = node.children.find(child => child.name === 'tcpflow').attribs;

        fObj.startime =new Date(fObj.startime);
        fObj.endtime =new Date(fObj.endtime);

        fObj.filename = node.children.find(child => child.name === 'filename').children[0].data;
        fObj.filesize = node.children.find(child => child.name === 'filesize').children[0].data;
        return fObj;
    });

    return fileObjects;
}
