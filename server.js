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
    canvasData.push(await getData('0x20f3fcd27d94a9d286d996c96b4e2d7c8f92758a'));
    canvasData.push(await getData('0x63f283c5590564b8a4d2c8f3ad5beedf7c0068c9'));
    canvasData.push(await getData('0x7b31d334d1a2de0af417616a06df3fe45bd81292'));
    canvasData.push(await getData('0x36a8cf04f663957ae5fb73f2be362db41969bc74'));
    canvasData.push(await getData('0xfc6d8024781ad58e4524aaf1b059a1a793dff246'));
    canvasData.push(await getData('0x6fadc1dccf9a7894b30022a89ce4796e81b7269c'));
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



