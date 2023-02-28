const express = require('express');
const axios = require('axios');
const PORT = process.env.PORT || 3030

const headers = {
    'Content-Type': 'application/json'
}


const getObjectData = async (objectId) => {
    const res = await axios.post('https://fullnode.devnet.sui.io:443', {
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
    canvasData.push(await getData('0x672905a35012ba64c20be9c83bee3808abae0147'));
    canvasData.push(await getData('0xfb5c5f143ceebc7999574a53a85e412eb75409f2'));
    canvasData.push(await getData('0x1aa615a89c0ade912b96b10999eb7aa7573785d3'));
    canvasData.push(await getData('0x170a3812a86dd728778f765877a04a6fdb45667d'));
    canvasData.push(await getData('0x0c8e5a5c5a71909c16fd0bd6a0346317bb333329'));
    canvasData.push(await getData('0x7758fad9fc04f3a39782f45171247f043df22faa'));
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



