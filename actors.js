const fs = require('fs');
const path = require('path');
const nomnoml = require('nomnoml');

console.log('Hello World!');
const dataFolder = './data';
fs.readdir(dataFolder, (err, files) => {
    let actorsFolders = [];
    if (err) {
        console.error(err);
        return;
    }
    files.forEach(file => {
        console.log(file);
        let filePath = path.join(dataFolder, file);
        if (fs.statSync(filePath).isDirectory()) {
            actorsFolders.push(filePath);
        }
    });

    let actors = {};

    actorsFolders.forEach(actorFolder => {
        let ipFilePath = path.join(actorFolder, 'ip.txt');
        if (fs.existsSync(ipFilePath)) {
            let ip = fs.readFileSync(ipFilePath, 'utf8').trim();
            let actorName = path.basename(actorFolder);
            actors[actorName] = ip;
        }
    });

    let exchanges = [];

    actorsFolders.forEach(actorFolder => {
        let logsDir = path.join(actorFolder, 'tcpflow');
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

    function generateUmlDiagram() {
        let umlContent = '#uml: \n';
        umlContent += 'title: Exchanges between actors\n';
        umlContent += 'actor System\n';

        Object.keys(actors).forEach(actor => {
            umlContent += `[${actor}]\n`;
        });

        exchanges.forEach(exchange => {
            let srcActor = getActorByIp(exchange.srcIp);
            let dstActor = getActorByIp(exchange.dstIp);
            if (srcActor && dstActor) {
                umlContent += `[${srcActor}] -> [${dstActor}]\n`;
            }
        });

        const svg = nomnoml.renderSvg(umlContent);
        fs.writeFileSync('diagram.svg', svg);
        console.log('UML diagram generated: diagram.svg');
    }

    function getActorByIp(ip) {
        return Object.keys(actors).find(actor => actors[actor] === ip);
    }
});