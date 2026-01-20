set -o errexit

npm install
npm run build
npm run worker:prod
npx prisma generate
npx prisma migrate deploy