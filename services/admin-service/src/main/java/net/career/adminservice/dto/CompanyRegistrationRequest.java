package net.career.adminservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyRegistrationRequest {

    @NotBlank(message = "Company name is required")
    private String name;
}
