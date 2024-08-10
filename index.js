const fs = require('fs');
const path = require('path');

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

    actorsFolders.forEach(actorFolder => {
        let tcpflowFolder = actorFolder + '/log/tcpflow';

        if (fs.statSync(tcpflowFolder).isDirectory()) {
            fs.readdir(tcpflowFolder, (err, files) => {
                if (err) {
                    console.error(err);
                    return;
                }
                files.forEach(file => {

                    // console.log(file);

                    if (file === 'report.xml') {
                        let filePath = path.join(tcpflowFolder, file);
                        fs.readFile(filePath, 'utf8', (err, data) => {
                            if (err) {
                                console.error(err);
                                return;
                            }

                            let lines = data.split('\n');
                            let nonEmptyLines = lines.filter(line => line.trim() !== '');
                            let lastLine = nonEmptyLines[nonEmptyLines.length - 1].trim();
                            console.log(lastLine);

                            if (lastLine.startsWith('</fileobject>')) {

                                let xmlEndTag1 = '</configuration>';
                                let xmlEndTag2 = '</dfxml>';
                                lines.push(xmlEndTag1);
                                lines.push(xmlEndTag2);

                                fs.writeFile(filePath, lines.join('\n'), 'utf8', (err) => {
                                    if (err) {
                                        console.error(err);
                                        return;
                                    }
                                    console.log('File saved!');
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});