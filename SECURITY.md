# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | Yes                |
| < 1.0   | No                 |

## Reporting a Vulnerability

We take all security reports seriously.
When we receive such reports,
we will investigate and subsequently address
any potential vulnerabilities as quickly as possible.

### How to Report

If you discover a potential security issue in this project,
please notify AWS/Amazon Security via our
[vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/)
or directly via email to [AWS Security](mailto:aws-security@amazon.com).

Please do *not* create a public GitHub issue in this project.

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Based on severity

### Security Updates

Security patches are released as part of regular version updates.
Critical vulnerabilities may receive expedited patch releases.

## Security Best Practices

When deploying MCP Registry Gateway:

1. **Use HTTPS**: Always enable TLS in production
2. **Secure Credentials**: Use environment variables, never commit secrets
3. **Network Isolation**: Deploy behind a firewall with restricted access
4. **Regular Updates**: Keep all dependencies and container images updated
5. **Access Control**: Use OAuth/OIDC with appropriate scopes
