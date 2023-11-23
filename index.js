const dgram = require('dgram');
const ffmpeg = require('fluent-ffmpeg');
const server = dgram.createSocket('udp4');

server.on('listening', (msg) => {
    const address = server.address();
    console.log(`UDP Server listening on ${address.address}:${address.port}`);

    const multicastAddress = '239.255.255.250';
    server.addMembership(multicastAddress);
    console.log(`UDP Server listening for multicast packets on ${multicastAddress}`);


});

server.on('message', (message, remote) => {
    console.log(`Received multicast message from ${remote.address}:${remote.port}`);
    // Process the message...
    // Assuming msg contains the video stream data
    const ffmpegProcess = ffmpeg()
        .input(message)
        .inputFormat('mpegts') // Adjust according to your stream format
        .output('output.mp4')
        .on('end', () => console.log('Stream saved'))
        .on('error', (err) => console.error(err))
        .run();
});

server.bind(1234); // Repl