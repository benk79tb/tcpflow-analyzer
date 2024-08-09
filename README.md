# Data analyzer for a poc

This software is used to analyse the results of a POC

```bash
docker build -t data-analyzer .
```


```bash
docker run -v ./data:/data -it data-analyzer
```