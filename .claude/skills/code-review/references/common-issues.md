# Common Code Review Issues

## FastAPI Issues

### Missing Response Model
```python
# Bad
@router.get("/servers/{id}")
async def get_server(id: str):
    return await service.get(id)

# Good
@router.get("/servers/{id}", response_model=ServerResponse)
async def get_server(id: str) -> ServerResponse:
    server = await service.get(id)
    return ServerResponse.model_validate(server)
```

### Incorrect Status Codes
```python
# Bad - Returns 200 for creation
@router.post("/servers/")
async def create_server(data: ServerCreate):
    return await service.create(data)

# Good - Returns 201 for creation
@router.post("/servers/", status_code=201)
async def create_server(data: ServerCreate):
    return await service.create(data)
```

### Missing Error Handling
```python
# Bad
@router.get("/servers/{id}")
async def get_server(id: str):
    return await service.get(id)  # Returns None if not found

# Good
@router.get("/servers/{id}")
async def get_server(id: str):
    server = await service.get(id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server
```

## Pydantic Issues

### Using v1 Syntax
```python
# Bad (v1 syntax)
class Server(BaseModel):
    class Config:
        orm_mode = True

# Good (v2 syntax)
class Server(BaseModel):
    model_config = ConfigDict(from_attributes=True)
```

### Missing Validation
```python
# Bad
class ServerCreate(BaseModel):
    name: str
    url: str

# Good
class ServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., pattern=r"^https?://")
```

## Async Issues

### Blocking in Async Function
```python
# Bad - blocks event loop
async def fetch_data():
    response = requests.get(url)  # Blocking!
    return response.json()

# Good - uses async client
async def fetch_data():
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()
```

### Missing Await
```python
# Bad - coroutine not awaited
async def process():
    service.async_method()  # Missing await!

# Good
async def process():
    await service.async_method()
```

## Security Issues

### Hardcoded Secrets
```python
# Bad
API_KEY = "sk-abc123..."

# Good
API_KEY = os.environ.get("API_KEY")
```

### SQL/NoSQL Injection
```python
# Bad
query = {"$where": f"this.name == '{user_input}'"}

# Good
query = {"name": user_input}
```

### Missing Input Validation
```python
# Bad
@router.get("/search")
async def search(q: str):
    return await db.find({"$text": {"$search": q}})

# Good
@router.get("/search")
async def search(q: str = Query(..., min_length=1, max_length=100)):
    sanitized = sanitize_search_query(q)
    return await db.find({"$text": {"$search": sanitized}})
```

## Testing Issues

### Not Testing Error Cases
```python
# Bad - only tests happy path
def test_get_server():
    result = service.get("123")
    assert result is not None

# Good - tests both paths
def test_get_server_found():
    result = service.get("123")
    assert result is not None

def test_get_server_not_found():
    with pytest.raises(NotFoundError):
        service.get("nonexistent")
```

### Hardcoded Test Data
```python
# Bad
def test_create():
    server = service.create({"name": "test"})
    assert server.id == "123"  # Fragile!

# Good
def test_create():
    server = service.create({"name": "test"})
    assert server.id is not None
    assert server.name == "test"
```
