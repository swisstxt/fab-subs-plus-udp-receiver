const http = require('http')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg');
const webvtt = require('node-webvtt')
const koa = require('koa')
const { koaBody } = require('koa-body')
const app = new koa()

let startTime = new Date().getTime()
let ffmpegCommand = undefined
const startFFmpeg = function() {
    ffmpegCommand = ffmpeg()
    .input('udp://239.192.0.86:3791')
    .outputOptions(['-map 0:v', '-map 0:a'])
    .on('start', function() {
        console.log('start')
        startTime = new Date().getTime()
    })
    .on('error', function(error) {
        console.log('error', error)
    })
    .save('test3.mkv')
}


const cues = []


app.use(koaBody())
app.use(async ctx => {

    if(ctx.request.url === '/start') {
        http.get('http://localhost:8001/livetranscription/start', (resp) => {
            let data = ''

            resp.on('data', (chunk) => {
                data += chunk
            })

            resp.on('end', () => {
                console.log('Response:', data)
            })
        })
        startFFmpeg()

    } else if(ctx.request.url === '/end') {
        http.get('http://localhost:8001/livetranscription/stop', (resp) => {
            let data = ''

            resp.on('data', (chunk) => {
                data += chunk
            })

            resp.on('end', () => {
                console.log('Response:', data)
            })
        })
        ffmpegCommand.kill()
        const secondsSinceStart = Math.round((new Date().getTime() - startTime) / 1000)
        if(cues.length > 0 && cues[cues.length -1].end === false) {
            console.log('setting end time on last cue', secondsSinceStart)
            cues[cues.length -1].end = secondsSinceStart
        }
        const vttfile = webvtt.compile({
            cues: cues,
            valid: true
        })
        fs.writeFileSync('subtitle.vtt', vttfile)
        console.log('written subtitle file')
        //console.log('vttfile', vttfile)
    } else if(ctx.request.url.startsWith('/subtitle')) {
        //console.log('got subtitle')
        //console.log(ctx.request.body)
        const secondsSinceStart = Math.round((new Date().getTime() - startTime) / 1000)
        const sub = webvtt.parse(ctx.request.body, {strict: false})
        let cue = undefined
        if(sub.cues.length > 0) {
            console.log('setting start time on current cue', secondsSinceStart)
            cue = sub.cues[0]
            cue.start = secondsSinceStart
            cue.end = false
        }
        if(cues.length > 0 && cues[cues.length -1].end === false) {
            console.log('setting end time on last cue', secondsSinceStart)
            cues[cues.length -1].end = secondsSinceStart
        }
        if(cue !== undefined) {
            console.log('pushing cue', cue)
            cues.push(cue)
        }
        //console.log('subtitle', sub)

    }
    
    //console.log('req',ctx)
    ctx.body = 'Hello world'
})


console.log('Hello')
app.listen(3000)
console.log('end')

//ffmpeg -y -i udp://239.253.1.2:5000 -c copy -f segment -segment_atclocktime 1 -segment_time 30 -reset_timestamps 1 -strftime 1 out-%Y%m%dT%H%M.mkv