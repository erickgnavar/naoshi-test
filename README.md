# naoshi-test

Simple HTTP service with a `/ping` health endpoint, a `/time` JSON endpoint, and a SQLite-backed `/notes` API.

## Requirements

- Node.js >= 22.5 (uses the built-in `node:sqlite` module — no external database dependency)

## Run

```sh
npm start                # listens on port 3000
PORT=8080 npm start      # custom port
```

The SQLite database is stored in `./data.sqlite` by default. Override with:

```sh
SQLITE_PATH=/path/to/db.sqlite npm start
```

## Endpoints

| Method | Path             | Description                                        |
| ------ | ---------------- | -------------------------------------------------- |
| GET    | `/ping`          | Health check, returns `ok`                         |
| GET    | `/time`          | Current server time as JSON                        |
| GET    | `/notes`         | List all notes                                     |
| POST   | `/notes`         | Create a note — body: `{"text": "..."}`            |
| GET    | `/notes/:id`     | Get a note by id                                   |
| DELETE | `/notes/:id`     | Delete a note by id                                |

## Test

```sh
npm test
```
