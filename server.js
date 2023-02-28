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
    canvasData.push(await getData('0xba7c1cb5398161f5194856b2057338011c3e8978'));
    canvasData.push(await getData('0x047867f6cdf58e155f7386afe3a73d27fbc174bf'));
    canvasData.push(await getData('0x891c20ba5aebaeedd3ae162296a979734e4f7df9'));
    canvasData.push(await getData('0x9d52e69a05c892728d41f88e41a61f5eca511b3c'));
    canvasData.push(await getData('0x65b5bae2d8ff0778710d9439ed9ffa987eaa63b6'));
    canvasData.push(await getData('0xd2310147579a817bdc133842a641890943d4b6f9'));
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



