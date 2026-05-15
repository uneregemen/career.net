package net.career.adminservice.service;

import lombok.RequiredArgsConstructor;
import net.career.adminservice.dto.CompanyRegistrationRequest;
import net.career.adminservice.dto.CompanyResponse;
import net.career.adminservice.model.Company;
import net.career.adminservice.repository.CompanyRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final CompanyRepository companyRepository;
    private final RestTemplate restTemplate;

    @Qualifier("jobServiceUrl")
    private final String jobServiceUrl;

    // Any authenticated user can register their company (once)
    @Transactional
    public CompanyResponse register(CompanyRegistrationRequest request, String cognitoUserId) {
        if (companyRepository.existsByCognitoUserId(cognitoUserId)) {
            throw new RuntimeException("Company already registered for this user");
        }

        Company company = Company.builder()
                .name(request.getName())
                .cognitoUserId(cognitoUserId)
                .verified(false)
                .admin(false)
                .build();

        return CompanyResponse.from(companyRepository.save(company));
    }

    // Returns all companies — only admins should call this (checked in controller)
    public List<CompanyResponse> listAll(String callerCognitoId) {
        assertAdmin(callerCognitoId);
        return companyRepository.findAll()
                .stream().map(CompanyResponse::from).toList();
    }

    // Admin approves a company so they can post jobs
    @Transactional
    public CompanyResponse verify(UUID companyId, String callerCognitoId) {
        assertAdmin(callerCognitoId);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found: " + companyId));

        company.setVerified(true);
        return CompanyResponse.from(companyRepository.save(company));
    }

    // Verified company or admin posts a job — delegates to Job Service
    public Map postJob(Map<String, Object> jobRequest, String cognitoUserId, String bearerToken) {
        Company company = companyRepository.findByCognitoUserId(cognitoUserId)
                .orElseThrow(() -> new RuntimeException("Company not found for this user"));

        if (!company.isVerified() && !company.isAdmin()) {
            throw new RuntimeException("Company is not verified yet");
        }

        // Forward the JWT so Job Service can verify the caller
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", bearerToken);
        headers.set("Content-Type", "application/json");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(jobRequest, headers);

        return restTemplate.postForObject(
                jobServiceUrl + "/api/v1/jobs",
                entity,
                Map.class);
    }

    private void assertAdmin(String cognitoUserId) {
        Company caller = companyRepository.findByCognitoUserId(cognitoUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!caller.isAdmin()) {
            throw new RuntimeException("Admin access required");
        }
    }
}
