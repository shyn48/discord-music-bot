const Discord = require('discord.js')
const prefix = "$"
const token = process.env.TOKEN
const ytdl = require('ytdl-core')
const client = new Discord.Client();
const queue = new Map();
const Youtube = require('discord-youtube-api')
const youtube = new Youtube("process.env.GOOGLEAPI")

client.once('ready', () => {
    console.log("Ready!")
})

client.once('reconnecting', () => {
    console.log("Reconnecting")
})

client.once('disconnect', () => {
    console.log("Disconnect")
})

client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
       } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
       } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
       }else if (message.content.startsWith(`${prefix}leave`)) {
            leave(message, serverQueue);
            return;
       } else {
        message.channel.send('wtf is that supposed to mean')
       }
})

async function searchYoutube(args) {
    var video = await youtube.searchVideos(args)
    return String(video.url);
}

async function execute(message, serverQueue) {
    const args = message.content.split(' ');
    args.shift()
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send('Who am I supposed to play the song for?');
     const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
     return message.channel.send('I do not have access to this channel');
    }

    const songInfo = await ytdl.getInfo((await searchYoutube(args)).toString(), {filter: 'audioonly'});

    const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
    };


    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 4,
            playing: true,
           };
           // Setting the queue using our contract
           queue.set(message.guild.id, queueContruct);
           // Pushing the song to our songs array
           queueContruct.songs.push(song);
           
           try {
            // Here we try to join the voicechat and save our connection into our object.
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            // Calling the play function to start a song
            play(message.guild, queueContruct.songs[0], message);
            message.channel.send(`${song.title} is now playing`);
           } catch (err) {
            // Printing the error message if the bot fails to join the voicechat
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
           }
        
    } else {
     serverQueue.songs.push(song);
     console.log(serverQueue.songs);
     return message.channel.send(`${song.title} is now playing`);
    }

}

function play(guild, song, message) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id)
        return;
    }
    const dispatcher = serverQueue.connection.play(ytdl(song.url))
    .on('finish', () => {
        console.log("Music ended")

        serverQueue.songs.shift();

        play(guild, serverQueue.songs[0])

    })
    .on('error', err =>{
        console.log(err)
    })
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

}

function skip(message, serverQueue) {
	if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to stop the music!');
	if (!serverQueue) return message.channel.send('There is no song that I could skip!');
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
	if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to stop the music!');
    serverQueue.connection.dispatcher.end();
    serverQueue.songs = [];
}

function leave(message){
    if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to do shit to me!');
    message.member.voice.channel.leave()
    return message.channel.send('Proshchay moy drug')
}

client.login(token)
