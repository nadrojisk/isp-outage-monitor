# ISP Outage Monitor

This little script gets you an overview how stable your internet connection is. It logs all outages and has a gui, so you can see if you have online connection and the datetime and duration of every outage.

## Installation on a Raspberry PI (Model B)

I assume, that you have allready copied the files to your raspberry pi. 

In the next step install NodeJS if you have not allready done. This could take a while.

```bash
sudo apt-get update  
sudo apt-get full-upgrade  
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -  
sudo apt-get install -y nodejs
sudo apt-get install -y npm
```

After that run ``npm install`` to get all the dependencies of this script. Create a folder **database** in the root path of this little app where the outages were stored.

Run the script in the background by:

```bash
nohup node .
```

## Docker

```bash
docker compose up --build   # then open http://localhost:8080
```

Released images are published to `ghcr.io/nadrojisk/isp-outage-monitor`. To cut a release, tag the commit
on `master` (`git tag v1.0.1 && git push origin v1.0.1`); the *Publish image* workflow builds and pushes
`1.0.1` and `1.0`. Outage data lives in `/usr/src/app/database`; mount a volume there to keep it.

### Logs

One JSON object per line on stdout (`docker logs`), so log collectors such as Loki can filter on fields:

```
{"time":"2026-09-21T11:00:13.627Z","level":"warn","msg":"outage began: no reply from google.com","event":"outage_began","target":"google.com"}
{"time":"2026-09-21T11:02:21.803Z","level":"warn","msg":"outage ended after 128s","event":"outage_ended","duration_s":128}
```

`event` is one of `started`, `check_online` (first successful check), `outage_began`, `outage_ended` and `save_failed` (level `error`).
