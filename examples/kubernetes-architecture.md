# Kubernetes Architecture - List Syntax Example

This example demonstrates the Kubernetes architecture using list syntax with indentation.

## Usage

Copy the code block below into an Obsidian note to render the mind map:

````markdown
```mindmap
# Kubernetes Architecture

## Control Plane Components
- API Server
  - Serves as the front-end for the Kubernetes control plane
  - Exposes the Kubernetes API
  - Validates and configures data for API objects
  - Handles REST operations
- etcd
  - Consistent and highly-available key value store
  - Stores all cluster data
  - Provides watch mechanism for configuration changes
- Scheduler
  - Watches for newly created Pods with no assigned node
  - Selects a node for them to run on
  - Considers resource requirements, hardware/software/policy constraints
  - Affinity and anti-affinity specifications
  - Data locality, inter-workload interference, deadlines
- Controller Manager
  - Runs controller processes
  - Node Controller
    - Notices and responds when nodes go down
    - Manages node lifecycle
  - Replication Controller
    - Maintains correct number of pods
    - Ensures desired state
  - Endpoints Controller
    - Populates the Endpoints object
    - Connects Services to Pods
  - Service Account & Token Controllers
    - Create default accounts and API access tokens

## Node Components
- Kubelet
  - Primary node agent
  - Receives PodSpecs from API Server
  - Ensures containers described in PodSpecs are running
  - Reports node and pod status to API Server
- Kube-proxy
  - Network proxy
  - Maintains network rules on nodes
  - Implements Kubernetes Service concept
  - Handles TCP, UDP, SCTP streams
- Container Runtime
  - Software responsible for running containers
  - Supports Docker, containerd, CRI-O
  - Manages container lifecycle
- kubelet
  - Works with container runtime
  - Pulls images
  - Starts and stops containers

## Addons
- DNS
  - Serves DNS records for Kubernetes Services
  - Required for cluster functionality
- Dashboard
  - Web-based UI for Kubernetes clusters
  - Deploys and containerized applications
  - Manages cluster resources
- Cluster-level Logging
  - Centralized logging infrastructure
  - Stores container logs
  - No storage backend specified
- Cluster-level Monitoring
  - Tracks cluster health
  - Monitors resource usage
  - Provides metrics and alerts

## Core Concepts
- Pod
  - Smallest deployable unit
  - Contains one or more containers
  - Shared storage and network
  - Runs on a single node
- Service
  - Abstracts pod IP addresses
  - Provides stable network endpoint
  - Enables service discovery
  - Supports load balancing
- Volume
  - Data directory accessible to containers
  - Outlives containers
  - Supports multiple storage backends
  - Provides data persistence
- Namespace
  - Virtual cluster
  - Enables resource isolation
  - Supports multiple teams
  - Divides cluster resources
```
````