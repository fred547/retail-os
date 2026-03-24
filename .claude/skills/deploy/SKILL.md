# Deploy Workflow

## Trigger
User says: `/deploy`, "deploy to production", "ship it"

## Steps

1. Kill any stale build processes: `pkill -f 'next build' || true`
2. Run `npm run build` in web directory and confirm success
3. Run `npx vercel --prod` for web deployment
4. For Android: run `./gradlew assembleRelease` and confirm APK output
5. Run smoke tests: `npm test -- --grep smoke`
6. Report deployment URLs and any errors
