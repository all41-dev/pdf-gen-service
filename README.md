This is a module that serves to generate pdfs from received LaTeX string and, potentially, image imports that are added
along.
So far only the logic that generates images works.

Adding server logic that will listen to the requests will be added later.

There is a demo in `index.ts` that shows how the code works. To make it work run the command below:

```
docker build -t pdf-gen-service .
mkdir out
docker run --rm -v "$PWD/out":/out -w /out pdf-gen-service
```

This should create a pdf file along with some metadata files in newly created `out` folder.

If LaTeX string also has image imports, they should be added in a separate array as a parameter of a function used in `index.ts`.
They can be either base64 images or as urls that can be fetched.
