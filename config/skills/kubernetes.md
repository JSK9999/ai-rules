---
description: Kubernetes and container orchestration best practices
---

# Kubernetes Deployment & Operations Best Practices

## Workload Types

- Use **Deployment** for stateless services.
- Use **StatefulSet** for databases or persistent services.
- Use **DaemonSet** for node-level workloads (logging, monitoring).
- Use **Job/CronJob** for batch or scheduled tasks.

Correct example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx
          ports:
            - containerPort: 80
```

Avoid:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: web
      image: nginx
```

## Resource Management

- Always define **CPU and memory requests and limits**.
- Requests guarantee scheduling.
- Limits prevent resource starvation.

Example:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

## Health Checks

- Use probes to maintain container reliability.
- Prefer HTTP health endpoints.

Example:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

- **livenessProbe** restarts unhealthy containers.
- **readinessProbe** controls traffic routing.
- **startupProbe** supports slow-start applications.

## Service Exposure

- Use **ClusterIP** for internal services.
- Use **NodePort** or **LoadBalancer** for external access.
- Prefer **Ingress** for HTTP routing.

Example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

## Helm Chart Best Practices

- Store configuration in `values.yaml`.
- Avoid hardcoded environment values.
- Keep templates modular and reusable.
- Version charts using semantic versioning.

Example structure:

```text
mychart/
  Chart.yaml
  values.yaml
  templates/
```

## kubectl Workflows

Common commands:

```bash
kubectl get pods
kubectl get deployments
kubectl describe pod <name>
kubectl logs <pod>
kubectl apply -f manifest.yaml
kubectl exec -it <pod> -- /bin/sh
```

## Operational Practices

- Use **namespaces** to isolate environments.
- Apply consistent **labels and annotations**.
- Use **rolling updates** for zero-downtime deployments.
- Store secrets in **Kubernetes Secrets**.
- Monitor workloads with metrics and alerts.