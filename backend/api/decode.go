package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// decode decodes the JSON body of r into a value of type T and validates it.
// On error it writes the appropriate HTTP response and returns false.
func decode[T any](w http.ResponseWriter, r *http.Request) (T, bool) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return v, false
	}
	if err := validate.Struct(v); err != nil {
		var ve validator.ValidationErrors
		if errors.As(err, &ve) {
			msgs := make([]string, len(ve))
			for i, fe := range ve {
				msgs[i] = fieldError(fe)
			}
			http.Error(w, strings.Join(msgs, "; "), http.StatusUnprocessableEntity)
		} else {
			http.Error(w, "invalid request", http.StatusBadRequest)
		}
		return v, false
	}
	return v, true
}

func fieldError(fe validator.FieldError) string {
	field := strings.ToLower(fe.Field())
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, fe.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, fe.Param())
	case "email":
		return fmt.Sprintf("%s must be a valid email", field)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}
