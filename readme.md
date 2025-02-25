## After modifications pull changes in the EC2 instance and run following commands.

1. Stop Running docker container

```bash
sudo docker stop twitch-bot
```

2. Remove existing container
```bash
sudo docker rm twitch-bot
```

3. Rebuild from changes

```bash
cd Twitch-Bot
 sudo docker build -t twitch-bot .
```

4. Run the container

```bash
sudo docker run -d --name twitch-bot --env-file .env twitch-bot

```

5. Auto Restart 

```bash
sudo docker update --restart always twitch-bot
```

