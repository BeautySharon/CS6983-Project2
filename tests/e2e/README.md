# Browser end-to-end tests

Playwright tests the real React UI, Express API and MongoDB persistence. Each user has an isolated browser context. The main journey does not intercept or mock API responses.

## Setup and run

Use the Node version in the repository's `.nvmrc` and install all three dependency sets:

```sh
npm ci --prefix pawtrust-frontend
npm ci --prefix pawtrust-backend
npm ci --prefix tests/e2e
cd tests/e2e
npx playwright install chromium
cd ../..
```

Start a local MongoDB replica set (transactions are required):

```sh
docker run --detach --name pawtrust-e2e-mongo \
  --publish 127.0.0.1:27017:27017 mongo:7 --replSet rs0 --bind_ip_all
```

Once MongoDB is ready, initialize the replica set:

```sh
docker exec pawtrust-e2e-mongo mongosh --quiet --eval \
  'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Wait until `db.hello().isWritablePrimary` returns true. An existing local replica set can be reused without initializing it again.

```sh
E2E_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true' \
  npm test --prefix tests/e2e
```

Playwright starts and stops its own frontend on port 5192 and backend on port 8092. Those ports must be free; existing application servers are never reused. The backend receives a random, disposable JWT secret. No `.env` file is needed for E2E.

## Coverage

- Logged-out access to both role dashboards redirects to login.
- Incorrect credentials are rejected; valid login, refresh and logout work.
- An owner and two sitters register and log in through the UI.
- The owner posts a task and both sitters apply.
- Accepting one sitter produces one Accepted and one Not selected application on the owner dashboard. Only the selected sitter receives the task.
- Completion moves the task out of Accepted Tasks and into Finished & Reviews.
- The owner submits a review; the sitter sees its comment and average rating.
- Refreshing the dashboards preserves saved task, assignment, completion and review state.

## Isolation and evidence

The runner accepts only a loopback MongoDB URI with a replica set and always uses `pawtrust_test`. Each test generates unique accounts and removes only its users, tasks, applications and reviews. Do not run the backend integration suite concurrently against the same database: that suite clears fixture collections.

No production or remote database is supported. Runtime account passwords and signing keys are generated rather than stored in source. Failure traces contain disposable test sessions; share reports only with the project team and instructor.

```sh
npm run report --prefix tests/e2e
```

The HTML report includes owner/sitter screenshots for the completed journey. Failed actor sessions retain screenshots and traces. Reports are ignored by Git. `.github/workflows/e2e.yml` runs on PRs and main pushes in its own job/database container and uploads evidence for seven days. It does not modify deployment configuration in Issue #17.

These are regression tests for existing features. Their results do not establish a red-before-implementation history for those features.
