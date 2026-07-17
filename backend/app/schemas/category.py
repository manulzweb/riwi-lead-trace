from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class CategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
