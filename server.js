const express = require('express');
const axios = require('axios');
const PORT = process.env.PORT || 3030

const headers = {
    'Content-Type': 'application/json'
}


const getObjectData = async (objectId) => {
    const res = await axios.post('https://pixelwave-ws.onrender.com', {
        'jsonrpc': '2.0',
        'id': '1',
        'method': 'sui_getObject',
        'params': [
            objectId
        ]
    }, {
        headers: headers
    })
    console.log('data received')
    return res.data.result.details.data
}

const convertToUint8ClampedArray = (data) => {
    const uint8ClampedArray = new Uint8ClampedArray(data.length * 4);

    for (let i = 0; i < data.length; i++) {
        const pixel = data[i].fields;
        const index = i * 4;

        uint8ClampedArray[index] = pixel.red;
        uint8ClampedArray[index + 1] = pixel.green;
        uint8ClampedArray[index + 2] = pixel.blue;
        uint8ClampedArray[index + 3] = 255; // set alpha to 255
    }

    return uint8ClampedArray;
}

const getData = async (objectId) => {
    const canvas = await getObjectData(objectId)
    const convertedData = convertToUint8ClampedArray(canvas.fields.field)
    return Promise.resolve(convertedData)
}

const canvasData = [];

async function loadCanvasData() {
    canvasData.push(await getData('0x769d1154b9bb312c9e57763a80ba8e379f74112d'));
    canvasData.push(await getData('0x0334f7cb82a287b808c12bd8c7c071d1afee2402'));
    canvasData.push(await getData('0xaad3038147a016f3caf5c0af919ef920996655e7'));
    canvasData.push(await getData('0x2e40b3cbb716bf147f95716b20816a80e316577e'));
    canvasData.push(await getData('0x2c6c0fa6d66c4b50eb58e7b6fa34f58842f78067'));
    canvasData.push(await getData('0xd459eadf4db8b641ad52dbe11124cba5af27c6eb'));
}

loadCanvasData().then(() => {
    const app = express();
    const server = app.listen(PORT);
    let io = require('socket.io')(server, {
        cors: {
            origin: '*',
        }
    });

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);
        socket.emit('canvasData', canvasData);
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });

        socket.on('updatePixel', (updatedData) => {
            let { index, color, canvasId } = updatedData;
            console.log('update pixel called')
            // Update the canvasData array with the new pixel color
            canvasData[canvasId][index * 4] = color[0];
            canvasData[canvasId][index * 4 + 1] = color[1];
            canvasData[canvasId][index * 4 + 2] = color[2];
            canvasData[canvasId][index * 4 + 3] = color[3];
            // Broadcast the updated pixel to all connected clients
            const data = {
                index: index,
                color: color,
                canvasId: canvasId
            }
            io.emit('pixelUpdated', data);
        })
    });
});



