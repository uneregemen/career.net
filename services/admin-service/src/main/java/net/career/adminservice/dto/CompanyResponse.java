package net.career.adminservice.dto;

import lombok.*;
import net.career.adminservice.model.Company;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyResponse {

    private UUID id;
    private String name;
    private boolean verified;
    private boolean admin;
    private LocalDateTime createdAt;

    public static CompanyResponse from(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .verified(company.isVerified())
                .admin(company.isAdmin())
                .createdAt(company.getCreatedAt())
                .build();
    }
}
