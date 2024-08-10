const fs = require('fs');
const path = require('path');
// const nomnoml = require('nomnoml');
const htmlparser2 = require('htmlparser2');
const { exec } = require('child_process');

// const { Diagram, Parser } = require('js-sequence-diagrams');
// const mermaid = require('mermaid');

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
        console.log(actorFolder);
        let ipFilePath = path.join(actorFolder, 'log', 'ip.txt');
        if (fs.existsSync(ipFilePath)) {
            let ip = fs.readFileSync(ipFilePath, 'utf8').trim();
            let actorName = path.basename(actorFolder);
            actors[actorName] = ip;
        }
    });

    console.log(actors);

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

    console.log(exchanges.length);
    console.log(exchanges[0]);

    exchanges.sort((a, b) => {
        return a.startime - b.startime;
    });
    generateUmlDiagram();

    
    async function generateUmlDiagram() {
        //const mermaid = await import('mermaid');
        let umlContent = '\nsequenceDiagram\n';
        // umlContent += 'title: Exchanges between actors\n';
        // umlContent += 'actor System\n';

        // Object.keys(actors).forEach(actor => {
        //     umlContent += `[${actor}]\n`;
        // });

        exchanges.forEach(exchange => {
            // console.log(exchange);
            let srcActor = getActorByIp(exchange.src_ipn);
            let dstActor = getActorByIp(exchange.dst_ipn);
            if (srcActor && dstActor) {
                umlContent += `  ${srcActor}->>${dstActor}: Message\n`;
            }
        });

        
        const tempMermaidFile = 'temp_mermaid.mmd';
        fs.writeFileSync(tempMermaidFile, umlContent);


        exec(`mmdc -i ${tempMermaidFile} -o mermaid_diagram.svg`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Erreur lors de la génération du diagramme: ${stderr}`);
                return;
            }
            console.log('UML sequence diagram generated: mermaid_diagram.svg');
            fs.unlinkSync(tempMermaidFile); // Supprimer le fichier temporaire
        });
        
        // mermaid.mermaidAPI.render('mermaidSvg', mermaidSource, (svg) => {
        //     fs.writeFileSync('mermaid_diagram.svg', svg);
        // });

        // const diagram = Diagram.parse(input);
        // const svg = diagram.drawSVG();

        // fs.writeFileSync('sequence_diagram.svg', svg);

        // const svg = nomnoml.renderSvg(umlContent);
        // fs.writeFileSync('diagram.svg', svg);
        console.log('UML diagram generated: diagram.svg');
    }

    function getActorByIp(ip) {
        let actorName = Object.keys(actors).find(actor => actors[actor] === ip)
        return actorName || 'vLEI Server';
        // return  || ip;
    }
});


function extractFileObjects(reportContent) {
    const dom = htmlparser2.parseDocument(reportContent);


    // let getFileobjectsNodes(dom);
    return getFileobjectsNodes(dom);

    console.log(dom)

    process.exit(0);

}

function getFileobjectsNodes(node) {

    let dfxmlNode = node.children.find(child => child.name === 'dfxml');


    let configurationNodes = dfxmlNode.children.filter(child => child.name === 'configuration');

    let fileobjectNodes = [];
    configurationNodes.forEach(configurationNode => {

        configurationNode.children.filter(child => child.name === 'fileobject').forEach(fileobjectNode => {
            fileobjectNodes.push(fileobjectNode);
        });
        // fileobjectNodes.push();
    });
    // console.log(fileobjectNodes);

    let fileObjects = fileobjectNodes.map(node => {

        let fObj = node.children.find(child => child.name === 'tcpflow').attribs;

        fObj.startime =new Date(fObj.startime);
        fObj.endtime =new Date(fObj.endtime);

        fObj.filename = node.children.find(child => child.name === 'filename').children[0].data;
        fObj.filesize = node.children.find(child => child.name === 'filesize').children[0].data;



        // fObj.filesize = transformNode(node.children.find(child => child.name === 'filesize'));
        // console.log (fObj);
        // console.log (fObj.filename);
        // process.exit(0);
        return fObj;
    });

    // console.log (fileObjects[0]);
    // process.exit(0);
    return fileObjects;
}

function transformNode(node) {
    // console.log(node);
    if (node.type === 'tag') {
        const obj = {
            tag: node.name,
            attributes: node.attribs,
            children: node.children.map(transformNode)
        };
        return obj;
    } else if (node.type === 'text') {
        return {
            type: 'text',
            content: node.data
        };
    }
    return null;
}