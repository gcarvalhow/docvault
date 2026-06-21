from collections.abc import Sequence

def _format_validation_errors(errors: Sequence[dict]) -> list[dict]:
    result = []

    for error in errors:
        loc = [str(l) for l in error.get("loc", []) if l != "body"]
        field = ".".join(loc) if loc else "body"
        error_type = error.get("type", "")
        ctx = error.get("ctx", {})

        if error_type == "missing":
            message = "Required field"
        elif error_type == "string_too_short":
            min_len = ctx.get("min_length", 1)
            message = "Cannot be blank" if min_len <= 1 else f"Minimum {min_len} characters"
        elif error_type == "string_too_long":
            message = f"Maximum {ctx.get('max_length', '')} characters"
        elif "email" in error_type or "email" in error.get("msg", "").lower():
            message = "Invalid email"
        elif "uuid" in error_type:
            message = "Invalid ID"
        elif error_type == "enum":
            message = f"Invalid value. Options: {ctx.get('expected', '')}"
        elif "int" in error_type:
            message = "Must be an integer"
        elif "float" in error_type or "decimal" in error_type:
            message = "Must be a number"
        elif "bool" in error_type:
            message = "Must be true or false"
        else:
            message = error.get("msg", "Invalid value")

        result.append({"field": field, "message": message})

    return result