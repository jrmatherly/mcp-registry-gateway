# Code Review Checklist

## Code Structure

### Functions
- [ ] Functions are under 50 lines
- [ ] Single responsibility principle followed
- [ ] Private functions prefixed with `_`
- [ ] Clear, descriptive names

### Type Annotations
- [ ] All function parameters typed
- [ ] Return types specified
- [ ] Optional types use `Optional[T]`
- [ ] Complex types use type aliases

### Documentation
- [ ] Public functions have docstrings
- [ ] Complex logic has comments (why, not what)
- [ ] No outdated comments

## FastAPI Specific

### Endpoints
- [ ] Appropriate HTTP method
- [ ] Correct status codes
- [ ] Response model defined
- [ ] Error responses documented
- [ ] Path/query params typed

### Dependencies
- [ ] Using `Depends()` for injection
- [ ] Dependencies are reusable
- [ ] No circular dependencies

### Validation
- [ ] Pydantic models for request bodies
- [ ] Field constraints defined
- [ ] Custom validators where needed

## Async Code

- [ ] Using `async/await` correctly
- [ ] No blocking calls in async functions
- [ ] `asyncio.gather()` for concurrent ops
- [ ] Proper cleanup with `async with`

## Security

### Input Handling
- [ ] All user input validated
- [ ] No SQL/NoSQL injection risks
- [ ] No command injection risks

### Authentication
- [ ] Protected endpoints require auth
- [ ] Scopes checked correctly
- [ ] No sensitive data in logs

### Secrets
- [ ] No hardcoded credentials
- [ ] Secrets from environment
- [ ] `.env` files gitignored

## Testing

### Coverage
- [ ] New code has tests
- [ ] Edge cases tested
- [ ] Error paths tested

### Quality
- [ ] Tests are independent
- [ ] Clear test names
- [ ] AAA pattern followed
- [ ] Appropriate use of mocks

## Performance

- [ ] No N+1 query issues
- [ ] Appropriate use of caching
- [ ] Efficient data structures
- [ ] No unnecessary computation

## Error Handling

- [ ] Specific exceptions used
- [ ] Errors logged with context
- [ ] User-friendly error messages
- [ ] Proper HTTP error codes
